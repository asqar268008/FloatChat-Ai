import psycopg2 as ps
from psycopg2.extras import Json
import pandas as pd 
import os
from dotenv import load_dotenv
load_dotenv()
class db:
    def __init__(self):    
        self.conn = ps.connect(
            database="agro",   # <-- use ARGO_project here
            user="postgres",
            password= os.getenv("POSTGRESQL_PASSWORD"),
            host="localhost",
            port="5432"
        )
        self.cur =  self.conn.cursor()


    def insert(self,name,file,type):
        self.cur.execute("""Insert into user1(name,file,types) VALUES (%s,%s,%s)""",(name,Json(file),type))
        self.conn.commit()


    def exec(self):
        self.cur.execute("""select name,types from user1""")
        l=(tuple([i[0] for i in self.cur.description]))
        rows = self.cur.fetchall()       
        return rows ,l
    
    def exec1(self,text):
        self.cur.execute(text)
        l=(tuple([i[0] for i in self.cur.description]))
        rows = self.cur.fetchall()  
        df=pd.DataFrame(rows,columns=l)   
        return df
    
    def close(self):
        """Close the database connection."""
        if self.cur:
            self.cur.close()
        if self.conn:
            self.conn.close()





