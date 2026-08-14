import os
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from config import settings

CHROMA_PATH = "chroma_db"
DOCS_PATH = "docs"

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def get_vector_store():
    if os.path.exists(CHROMA_PATH):
        return Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)
    
    print("Creating local vector database (ChromaDB) from documents...")
    loader = DirectoryLoader(DOCS_PATH, glob="**/*.txt", loader_cls=TextLoader)
    documents = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_documents(documents)
    
    db = Chroma.from_documents(chunks, embeddings, persist_directory=CHROMA_PATH)
    return db

# Connectcion with LM Studio
llm = ChatOpenAI(
    base_url=settings.lm_studio_url,
    api_key="TEXT", #type: ignore
    temperature=0.1, 
)

system_prompt = (
    "You are a professional corporate assistant, Office Help Desk. "
    "Answer colleagues' questions co ncisely, politely, and specifically in English. "
    "Base your answers ONLY on the provided context from office documents. "
    "If the answer is not in the context, explicitly state that you don't have such information in the documentation. "
    "I strictly forbid you from using words like: AI, artificial intelligence, bot, language model. "
    "Act like an experienced administration department employee.\n\n"
    "Context:\n{context}"
)

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}"),
])

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def get_answer(question: str) -> str:
    vector_store = get_vector_store()
    retriever = vector_store.as_retriever(search_kwargs={"k": 3})
    
    rag_chain = (
        {"context": retriever | format_docs, "input": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    
    return rag_chain.invoke(question)
