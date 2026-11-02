from pydantic import BaseModel
from typing import Any, Dict, List, Literal, Optional, Union

class Question(BaseModel):
    type: Literal["choice", "score", "noul"]
    instructions: str
    # dict = option -> description, list = plain option names, None for noul
    criteria: Optional[Union[Dict[str, str], List[str]]] = None


class PredictRequest(BaseModel):
    state: Union[str, Dict[str, Any]]
    questions: Dict[str, Question]