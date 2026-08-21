from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from websocket_manager import manager

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/realtime")
async def websocket_realtime(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, handle any incoming messages if needed
            data = await websocket.receive_text()
            # Echo or handle commands if needed
            # For now, just keep alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        manager.disconnect(websocket)