import os
import webbrowser
import base64
import pandas as pd
from langchain_core.prompts import PromptTemplate as prom
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage
from typing import TypedDict, Sequence, List, Any
import json
from langchain_community.document_loaders.text import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_mistralai import MistralAIEmbeddings
from .datadb import db

dbs = db()

class AgentState(TypedDict):
            messages: Sequence[BaseMessage]
            action: Sequence[BaseMessage]
            data: Sequence[BaseMessage]
            user: Sequence[BaseMessage]
            view: Sequence[BaseMessage]
            csv: List
            visual: str
            result: str
            
# Initialize RAG system
class RAGService:
    def __init__(self):
        self.setup_environment()
        self.setup_models()
        self.setup_vector_store()
        self.setup_agent()
    
    def setup_environment(self):
        """Set up environment variables"""
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        os.environ["OPENAI_API_KEY"] = self.api_key
    
    def setup_models(self):
        """Initialize AI models"""
        self.chat = ChatOpenAI(
            model_name="openai/gpt-oss-120b",
            base_url="https://openrouter.ai/api/v1",
            temperature=0.7
        )
        self.embed_model = MistralAIEmbeddings(
            model="mistral-embed",
            api_key='bHcb2GS9TUPCIokMOuvOK6XM4nju68d5'
        )
        self.chat1 = ChatOpenAI(
            model_name="openai/gpt-oss-20b",
            base_url="https://openrouter.ai/api/v1",
            temperature=0.7,
            max_tokens=500
        )
    
    def setup_vector_store(self):
        """Set up vector database"""
        try:
            # Load and process documents
            # loader = TextLoader('ArgoProgram.txt', encoding='utf-8')
            # document = loader.load()
            
            # text_splitter = RecursiveCharacterTextSplitter(
            #     chunk_size=500,
            #     chunk_overlap=50,
            #     separators=["\n\n", "\n", " ", ""],
            #     length_function=len
            # )
            
            # texts = text_splitter.split_documents(document)
            
            # Create vector store
            self.vectordb = Chroma(
                collection_name="Agro_data",
                embedding_function=self.embed_model,
                persist_directory="chroma_db"
            )
            
            # Add documents if empty
            # if self.vectordb._collection.count() == 0:
            #     self.vectordb.add_documents(texts)
            
            self.retriever = self.vectordb.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 3}
            )
            
        except Exception as e:
            print(f"Error setting up vector store: {e}")
            # Fallback: create empty retriever
            self.retriever = None
    
    def setup_agent(self):
        """Set up the LangGraph agent"""
        
        self.AgentState = AgentState
        
        # Agent description
        self.desc = """
        You are a helpful assistant that converts natural language into structured instructions. Your role is to interpret user queries and produce concise number for an Agent.
        user can ask in any language you need to understand and make desicion
        Rules:
        - Always determine whether the request is for retrive DATA or for Automation ,or"normal query".
        - If noraml genral question → end response with "1".
        - If data retrive or download  operation → end response with 2".

        - Output must be in two lines only:
        
        1. Either "1" or "2" depending on the task type.task type must be include
        
        genral question  tasks-1:.
        #  eg- what is this 
        # ,explain me ,
        # agro mean what?
        #  tell me the latitude ,longitude of atlantic ocean?
        -retrun '1'

        data retrive or download  operation-2:
        only to read data or select query.
        -user ask to donwload  data only  return-'2' else return 1

        note if user ask data in any format in natural language mean return 2 else return 1
        else return 1
        in query 'download' present mean return 2 else 1
        If the input is ambiguous, make the best guess based on common usage patterns. Do not ask clarifying questions,dont give empty text,user can ask any query in any language ,so answer it according to their language.
        """
        
        self.user1 = """
        🌊 Welcome to the Ocean Float Assistant!, you're RAG agent   here to help people to understand about  float,ocean ,ARGO ,make common people to underatand about the occean,explain everything you simply know dont hallucinate
        Dont generate any tabe . generate simple paragraph,or points,user can ask any query in any language ,so answer it according to their language """
        
        # Build the graph
        graph = StateGraph(AgentState)
        graph.add_node("listen", self.listen)
        graph.add_conditional_edges('listen', self.decsion, 
                                  {"download": "down", 'automate': 'auto', 'normal': 'norm'})
        graph.add_node("down", self.dataqu)
        graph.add_node("auto", self.autom)
        graph.add_node("norm", self.user)
        graph.set_entry_point('listen')
        graph.set_finish_point("down")
        graph.set_finish_point("auto")
        graph.set_finish_point("norm")
        
        self.app = graph.compile()
    
    def listen(self, state: AgentState) -> AgentState:
        """It listens to the user words and defines question"""
        print("Analysing......")
        result = self.chat.invoke(state["messages"])
        l = result.content.split('\n')
        
        state["visual"] = l[0].strip()
        if state["visual"] == '2':
            state["data"].append(state["messages"][-1])
        if state["visual"] == '3':
            state["action"].append(state["messages"][-1])
        else:
            state["user"].append(state["messages"][-1])
        print(state['visual'])
        return state
    
    def decsion(self, state: AgentState) -> str:
        """It makes decision where to go"""
        if state["visual"] == '2':
            return 'download'
        if state["visual"] == '3':
            return 'automate'
        else:
            return 'normal'
    
    def user(self, state: AgentState) -> AgentState:
        """It handles normal question"""
        print("generating....")
        
        if self.retriever:
            context = self.retriever.invoke(state["user"][-1].content)
            pro = prom.from_template("""rag agent   the context for you is 
            {cont}
            if you dont get context mean try to give your answer
            based on abovecontext generate answer 
                               the question is {ques}""")  
            state["user"][-1].content = pro.format(cont=context, ques=state["user"][-1].content)
        
        result = self.chat1.invoke(state["user"])
        state["user"].append(result)
        #state['result'] = "the data is ready click link to downoad" #it is output
        state["view"].append(result) 
        state['result']=result.content  
        print(state['result'])
        return state
    
    def dataqu(self, state: AgentState) -> AgentState:
        """It handles SQL query"""
        pr = prom.from_template("""Request by user:\n {question}
                              table name argodata 
                              interprupt question based on user the data schema  are
                                Column	Type	Description
                                time	object	Timestamp or time label (may need parsing to datetime)
                                latitude	float64	Sensor or observation latitude
                                longitude	float64	Sensor or observation longitude
                                nv	int64	Possibly a count or flag (e.g., number of valid observations)
                                EXFatemp	float64	Air temperature (°C or K?)
                                EXFaqh	float64	Specific humidity
                                EXFewind	float64	Eastward wind component
                                EXFnwind	float64	Northward wind component
                                EXFwspee	float64	Wind speed (derived or raw?)
                                EXFpress	float64	Atmospheric pressure
                                time_bnds	object	Time bounds (start/end of interval)
                                latitude_bnds	float64	Spatial bounds (latitudinal)
                                longitude_bnds	float64	
         question define queston for sql retiver in question mention tablename,column name,where conditon if necessary
    eg input :i need the data of chennai
    note- you dont have acess to write a data in sql ,you have aceess to read(so generate only a select query)
    Dont use  command .generate only  query based on table name in english
    output-"SELECT *
        FROM  Argo_table
        WHERE EXTRACT(YEAR FROM time) = 2024
        AND latitude  BETWEEN 8.0  AND 13.5   
        AND longitude BETWEEN 76.5 AND 80.5   
        always generate query in sql syntax 
        try to fullfill partial instruction
                                dont generate empty query        """)
        p = pr.format(question=state["data"][-1].content)
        state["data"][-1] = HumanMessage(content=p)
        result = self.chat.invoke(state["data"])
        print(result.content)
        # we need to add
        state['result']=result.content
        raw = str(state['result'])
        code_block = raw[raw.index("SELECT"):]
        code_block = code_block[:code_block.index(";")+1] if ";" in code_block else code_block
        print('l',code_block)
        l=dbs.exec1(code_block)
        print(l)
        state['result']="data is delivered click link to download"
        csv = l.to_csv(index=False)
        b64 = base64.b64encode(csv.encode()).decode()

# Generate HTML link
        html_link = f'''
        <html>
        <head><title>Download CSV</title></head>
        <body>
            <h2>Argo Data Export</h2>
            <a href="data:file/csv;base64,{b64}" download="argo_export.csv"> Click to Download CSV which you requested </a>
        </body>
        </html>
        '''
        with open("download_demo.html", "w", encoding="utf-8") as f:
            f.write(html_link)
        html_file = "download_demo.html"
        state["view"].append(AIMessage(content="✅ HTML download link generated. Open 'download_demo.html' in your browser."))
        print("✅ HTML download link generated. Open 'download_demo.html' in your browser.")
        file_url = f"file://{os.path.abspath(html_file)}"

# Open in a new browser tab
        webbrowser.open_new_tab(file_url)

        print("✅ HTML file opened in your default browser.")
        return state
    
    def autom(self, state: AgentState) -> AgentState:
        """It handles automation query"""
        print('automate')
        return state
    
    def query(self, user_message: str) -> str:
        """Main method to query the RAG system"""
        try:
            # Initialize state
            state = self.AgentState()
            state['messages'] = [SystemMessage(content=self.desc)]
            state['user'] = [SystemMessage(content=self.user1)]
            state['action'] = []
            state['data'] = [SystemMessage(content="""You are a strict PostgreSQL administrator responsible for managing and retrieving ARGO oceanographic data.""")]
            state['view'] = []
            
            # Add user message
            state['view'].append(HumanMessage(content=user_message))
            state['messages'].append(HumanMessage(content=user_message))
            
            # Invoke the agent
            result = self.app.invoke(state)
            
            return result.get('result', 'No response generated')
            
        except Exception as e:
            print(f"Error in RAG query: {e}")
            return f"I apologize, but I encountered an error: {str(e)}"

# Global instance
rag_service = RAGService()