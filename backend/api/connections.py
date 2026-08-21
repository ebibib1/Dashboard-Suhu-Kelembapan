from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Connection
from schemas import (
    ConnectionCreate, ConnectionUpdate, ConnectionResponse,
    ConnectionTestRequest, ConnectionTestResponse
)
from modbus_service import test_connection

router = APIRouter(prefix="/api/connections", tags=["connections"])


@router.get("", response_model=List[ConnectionResponse])
def list_connections(db: Session = Depends(get_db)):
    return db.query(Connection).order_by(Connection.created_at.desc()).all()


@router.post("", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED)
def create_connection(conn: ConnectionCreate, db: Session = Depends(get_db)):
    db_conn = Connection(**conn.model_dump())
    db.add(db_conn)
    db.commit()
    db.refresh(db_conn)
    return db_conn


@router.get("/{conn_id}", response_model=ConnectionResponse)
def get_connection(conn_id: int, db: Session = Depends(get_db)):
    db_conn = db.query(Connection).filter(Connection.id == conn_id).first()
    if not db_conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    return db_conn


@router.put("/{conn_id}", response_model=ConnectionResponse)
def update_connection(conn_id: int, conn: ConnectionUpdate, db: Session = Depends(get_db)):
    db_conn = db.query(Connection).filter(Connection.id == conn_id).first()
    if not db_conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    update_data = conn.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_conn, field, value)
    
    db.commit()
    db.refresh(db_conn)
    return db_conn


@router.delete("/{conn_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_connection(conn_id: int, db: Session = Depends(get_db)):
    db_conn = db.query(Connection).filter(Connection.id == conn_id).first()
    if not db_conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    db.delete(db_conn)
    db.commit()


@router.post("/test", response_model=ConnectionTestResponse)
def test_connection_endpoint(req: ConnectionTestRequest, db: Session = Depends(get_db)):
    db_conn = db.query(Connection).filter(Connection.id == req.connection_id).first()
    if not db_conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    success, message, data = test_connection(db_conn)
    return ConnectionTestResponse(success=success, message=message, data=data)