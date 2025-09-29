import io
import json
import pandas as pd
import plotly.io as pio
import plotly.express as px
import plotly.graph_objects as go
import matplotlib.pyplot as plt
import os
import subprocess
import pandas as pd
from langchain_core.prompts import PromptTemplate as prom
from langgraph.prebuilt import interrupt
from langgraph.graph import StateGraph
from .datadb import db
import plotly.io as pio
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage,SystemMessage,AIMessage,BaseMessage,ToolMessage
from typing import TypedDict,Sequence
import subprocess
import json
from langgraph.graph import StateGraph, END,START
from langgraph.prebuilt import  ToolNode
#df=pd.read_csv(r"ARGODATA.csv")

dbs=db()
#subprocess.run(["pip", "install", "pandas","matplotlib",'seaborn','plotly'], check=True)
#info=df.info()
api = os.getenv("OPENAI_API_KEY")


chat = ChatOpenAI(model_name="openai/gpt-oss-20b",
    base_url="https://openrouter.ai/api/v1",
    temperature=0.0,api_key=api)
chat1 = ChatOpenAI(model_name="openai/gpt-oss-120b",
    base_url="https://openrouter.ai/api/v1",
    temperature=0.0,api_key=api)
#openai/gpt-oss-120b


class AgentState(TypedDict):
    messages :Sequence[BaseMessage]
    graph :Sequence[BaseMessage]
    data:Sequence[BaseMessage]
    user :Sequence[BaseMessage]
    retrive1 :Sequence[BaseMessage]
    name:str
    query:str
    des:str
    result: str
    visual: str



def dataqu(state:AgentState)->AgentState:
    """it handle SQL query"""
    global chat
    pr=prom.from_template("""Request by user:\n {question}
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
note-
always generate query in this format
*if you select time mean  select like this DATE(time) AS Date and use 'as' to rename all column to simple name eg  -EXFatemp as Temperature
output-"SELECT *
    FROM  Argo_table
    WHERE EXTRACT(YEAR FROM time) = 2024
    AND latitude  BETWEEN 8.0  AND 13.5   
    AND longitude BETWEEN 76.5 AND 80.5   

                       """)
    p=pr.format(question=state['retrive1'][-1].content)
    state['retrive1'][-1]=HumanMessage(content=p)
    result=chat.invoke(state['retrive1'])
    #print(result.content)
    state['query']=result.content
    raw = str(state['query'])
    code_block = raw[raw.index("SELECT"):]
    code_block = code_block[:code_block.index("```")] if "```" in code_block else code_block
    
    state['query']=code_block
    print(code_block)
    l=dbs.exec1(code_block)
    print(l)
    l.to_csv("ARGODATA.csv")
    return state


def listen(state:AgentState)-> AgentState:
    """ it listen the user words and define question"""
    print("Analysing......")
    result=chat.invoke(state["messages"])

    l=result.content.split('\n')
    
    state["visual"]=l[-1].strip()
    state['messages'].append(result)
    state['retrive1'].append(HumanMessage(result.content))
    if state["visual"]=='1':
        
        state["graph"].append(HumanMessage(result.content))
   
    else:
        state["data"].append(HumanMessage(result.content))
    return state

def llm(state:AgentState)-> AgentState:
    """ this part is llm which generate reponse to the user and it use tools also"""
    print("Generating....")
    df=pd.read_csv("ARGODATA.csv")
    pr=prom.from_template("""Request by user:\n {question} generate python code .save the result in name user as a json  for graph or html for map only dont use any other name "
    the data schema  are{df}
    try to write python code to complete partial request if data does not completlty present
    in code remove the duplicate based on x axis if data row  length is big >15
    use common name for axis label eg EXFatemp as Temperature
    data shape is {shape} ,always add legend to the graph
    if data row  length is small <15 and you need to do line plot mean  write code for scatter
     use the column name only given in the above data schemma """)

    if state["visual"]=='1' :
        
        p=pr.format(question=state["graph"][-1].content,df=df.head(),shape=df.shape)
        state["graph"][-1]=HumanMessage(p)
        result=chat1.invoke(state["graph"])
        state["graph"].append(result)
        state['result']=result.content

        
    else:
        
        p=pr.format(question=state["data"][-1].content)
        state["data"][-1]=HumanMessage(p)
        result=chat1.invoke(state["data"])
        state["data"].append(result)
        state['result']=result.content
    
    print(state['result'],state['visual'])
    
    return state

def executor(state: AgentState) -> AgentState:
    try:
        raw = str(state['result'])
        code_block = raw[raw.index("import"):]
        code_block = code_block[:code_block.index("```")] if "```" in code_block else code_block
    
        print("executing....")

        # prepend dataset import
        code_block = (
            "import pandas as pd\n"
            "df = pd.read_csv(r'ARGODATA.csv')\n"
            + code_block
        )

        
        stdout_buffer = io.StringIO()

        
        def safe_print(*args, **kwargs):
            print(*args, **kwargs, file=stdout_buffer)

       
        globals_env = {
            "pd": pd,
            "plt": plt,
            "px": px,
            "go": go,
            "pio": pio,
            "json": json,
            "print": safe_print,
        }

        
        exec(code_block, globals_env)
        print('done')
        state['user'].append(AIMessage(f"check your file it is generated as {state['name']}"))
        # collect any printed output
        output = stdout_buffer.getvalue()
        if output.strip():
            state["user"].append(AIMessage(content=output))

        # handle visualizations
        if state["visual"] == '1':  # plotly figure
            with open("user.json", "r") as f:
                da = json.load(f)
            dbs.insert(state["name"], da, 'graph')
            pio.renderers.default = "browser"
            fig = pio.read_json("user.json")
            fig.show()

        elif state["visual"] == '2': 
            with open("user.json", "r") as f:
                da = json.load(f) # pandas table
            dbs.insert(state["name"], da, 'table')
            #df = pd.DataFrame.from_dict(da)
            
            print(da)

    except Exception as e:
        print("something wrong try again..", e)
        err_msg = HumanMessage(content="it show error like this " + str(e))
        if state["visual"] == '1':
            state["graph"].append(err_msg)
        else:
            state["data"].append(err_msg)

    return state

graph=StateGraph(AgentState)
graph.add_node("listen",listen)
graph.add_node("retre",dataqu)
graph.add_node("llm",llm)
graph.add_node("tool",executor)
graph.add_edge("listen","retre")
graph.add_edge("retre",'llm')
graph.add_edge('llm','tool')
graph.set_entry_point('listen')
graph.set_finish_point("tool")
app=graph.compile()

def Agent():
    global app
    return app