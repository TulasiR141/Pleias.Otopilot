import { useEffect, useState } from 'react';

function App() {
  const [node, setNode] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5154/api/chatbot/start")
      .then(res => res.json())
      .then(setNode);
  }, []);

  const handleAnswer = (answer) => {
    setHistory([...history, { question: node.question, answer }]);

    fetch("http://localhost:5154/api/chatbot/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: node.id, answer })
    })
      .then(res => res.json())
      .then(setNode);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Chatbot</h1>
      <div>
        {history.map((h, i) => (
          <p key={i}><b>{h.question}</b> → {h.answer}</p>
        ))}
      </div>
      {node && (
        <div>
          <p><b>{node.question}</b></p>
          {node.answers.map((a, i) => (
            <button key={i} onClick={() => handleAnswer(a.value)} style={{ margin: 4 }}>
              {a.value}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
