import { useState } from "react";

export default function App() {
  const [url, setUrl] = useState("");
  const [response, setResponse] = useState("");

  const handleSubmit = async () => {
    const res = await fetch("http://127.0.0.1:8000/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    setResponse(data.scraped);
  };

  return (
    <div className="p-4">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="border p-2 w-80"
        placeholder="Enter URL"
      />
      <button onClick={handleSubmit} className="ml-2 bg-blue-500 text-white p-2">
        Scrape
      </button>
      <pre className="mt-4">{response}</pre>
    </div>
  );
}
