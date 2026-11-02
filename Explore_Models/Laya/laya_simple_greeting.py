import laya
import copy

agent = laya.load("convaiinnovations/laya")

simple_sent_list = ["hello", "how", "are", "you", "doing", "today", "?"]

starting_point = {
    "sentence": {
        "type": "choice",
        "instructions": (
            "Choose the single most grammatically appropriate next word "
            "to construct a natural English sentence. "
            "Consider the existing sentence, grammatical structure, "
            "word order, and conversational context. "
            "Do not repeat previously used words."
        ),
        "criteria": {
            "hello": "A greeting used to initiate a conversation. It should appear at the beginning of the sentence.",
            "how": "An interrogative adverb introducing a question about someone's condition or activity. It follows the greeting.",
            "are": "An auxiliary verb used with the pronoun 'you' to form the present continuous question. It follows 'how'.",
            "you": "A second-person pronoun referring to the person being addressed. It follows 'are'.",
            "doing": "The present participle of 'do'. It follows 'are you' to ask about someone's current activity.",
            "today": "A time-related adverb referring to the current day. It follows 'doing' to complete the question.",
            "?": "Question-ending punctuation. It must be selected only after the sentence is complete."
        }
    }
}

final_sentence = ""
remaining_words = copy.deepcopy(simple_sent_list)

for _ in range(len(simple_sent_list)):

    current_question = copy.deepcopy(starting_point)

    current_question["sentence"]["instructions"] += (
        f"\nCurrent sentence: '{final_sentence.strip()}'"
        f"\nAvailable words: {remaining_words}"
        "\nSelect exactly one word from the available words."
    )

    current_question["sentence"]["criteria"] = {
        word: starting_point["sentence"]["criteria"][word]
        for word in remaining_words
    }

    result = agent.predict(final_sentence.strip(), current_question)

    next_word = result["answers"]["sentence"]["choice"]

    print(
        f"Current sentence: {final_sentence.strip()}, "
        f"Next word: {next_word}"
    )

    if next_word not in remaining_words:
        print("Invalid selection:", next_word)
        break

    remaining_words.remove(next_word)

    if next_word == "?":
        final_sentence = final_sentence.rstrip() + "?"
        break

    if next_word == "hello":
        final_sentence += "Hello, "
    else:
        final_sentence += next_word + " "

print(f"\nFinal sentence: {final_sentence.strip()}")