import json
import laya

agent = laya.load("convaiinovations/laya")

state = "Hi, we were billed twice for March, Please refund the duplicate today or we will cancel our plan."
questions = {
    "department": {
        "type": "choice",
        "instructions": "Which department should handle this?",
        "criteria": {
            "billing": "invoices, payments, refunds",
            "technical": "bugs, outages, system errors",
            "other": "everything else"
        }
    },
    "urgency": {
        "type": "score",
        "instructions": "How urgent is this issue?",
        "criteria": [
            "not urgent", "soon", "blocking"
        ]
    },
    "churn_risk": {"type": "noul", "instructions": "Does the user threaten to cancel or leave?"},
}

result = agent.predict(state, questions)


print(json.dumps(result, indent=2, default=str))



answers = result.get("answers", result)
print("Department:", answers["department"])
print("Urgency:", answers["urgency"])
print("Churn Risk:", answers["churn_risk"])