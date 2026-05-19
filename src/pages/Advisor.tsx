import { useState } from "react";

export default function AdvisorPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { role: string; content: string }[]
  >([]);

  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;

    const updatedMessages = [
      ...messages,
      {
        role: "user",
        content: input,
      },
    ];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      const data = await response.json();

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);

    } catch (error) {
      console.error(error);

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content:
            "Sorry, Ficium AI is temporarily unavailable.",
        },
      ]);
    }

    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-6">
        AI Advisor
      </h1>

      <div className="border rounded-xl p-4 h-[500px] overflow-y-auto bg-white mb-4">
        {messages.length === 0 && (
          <p className="text-gray-500">
            Ask Ficium AI about loans, rates, deposits,
            or banking decisions.
          </p>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-4 ${
              msg.role === "user"
                ? "text-right"
                : "text-left"
            }`}
          >
            <div
              className={`inline-block px-4 py-3 rounded-xl max-w-[80%] whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-black"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <p className="text-gray-500">
            Ficium AI is thinking...
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about loans, rates, or banking..."
          className="flex-1 border rounded-xl px-4 py-3"
        />

        <button
          onClick={sendMessage}
          className="bg-black text-white px-6 py-3 rounded-xl"
        >
          Send
        </button>
      </div>
    </div>
  );
}