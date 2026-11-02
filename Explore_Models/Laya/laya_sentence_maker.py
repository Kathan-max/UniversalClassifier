import laya
import copy

agent = laya.load("convaiinnovations/laya")

simple_sent_list = ["hello", "how", "are", "you", "doing", "today", "?"]

state = "I want to make a proper sentence from the given list of words."

starting_point = {
    "sentence": {
        "type": "choice",
        "instructions": (
            "Construct a grammatically correct English sentence using "
            "the available words. Select the word that should logically "
            "come next based on the current sentence."
        ),
        "criteria": {
            "hello": (
                "Greeting or opening expression. Should generally appear "
                "at the beginning of a conversational sentence, before "
                "the main question or statement."
            ),
            "how": (
                "Interrogative adverb used to introduce a question about "
                "someone's condition, method, or manner. Commonly follows "
                "a greeting, as in 'Hello, how are you?'"
            ),
            "are": (
                "Present-tense auxiliary or linking verb. In this sentence, "
                "it must follow the pronoun 'you' to form the question "
                "'how are you'."
            ),
            "you": (
                "Second-person pronoun referring to the person being "
                "addressed. In this sentence, it follows 'how' and "
                "precedes the verb 'are'."
            ),
            "doing": (
                "Present participle of 'do'. Used after the auxiliary "
                "'are' to ask about someone's current activity."
            ),
            "today": (
                "Time-related adverb specifying the current day. In this "
                "sentence, it follows 'doing' to complete the question "
                "about someone's current activity."
            ),
            "?": (
                "Question-ending punctuation. Must appear at the end "
                "of the sentence after all the words have been arranged."
            )
        }
    }
}

final_sentence = ""

"""
{'model': 'laya-rl-agent', 'answers': {'sentence': {'type': 'choice', 'choice': 'are', 'probabilities': {'how': 0.0456, 'are': 0.3716, 'you': 0.0725, 'doing': 0.1918, 'today': 0.1905, '?': 0.128}, 'confidence': 0.11, 'answer_confidence': 0.3716, 'action': {'act_probability': 1.0}}}, 'usage': {'input_tokens': 122, 'output_tokens': 0, 'state_tokens': 1, 'state_tokens_dropped': 0, 'truncated': False, 'truncated_questions': []}}
Final sentence:
"""

for word in simple_sent_list:
    current_question = copy.deepcopy(starting_point)
    current_question["sentence"]["instructions"] = f"What will come after the sentence '{final_sentence}' from the list of words?"
    # current_question["sentence"]["criteria"] = {word_val: definition for word_val,definition in current_question["sentence"]["criteria"].items()}
    result = agent.predict(word, current_question)
    # print(result)
    # break
    print(f"Current sentence: {final_sentence}, Next word: {result['answers']['sentence']['choice']}")
    final_sentence += result['answers']["sentence"]['choice']
    final_sentence += " "
    # print(f"Current word: {word}, Next word: {result['sentence']['choice']}")

print(f"Final sentence: {final_sentence.strip()}")