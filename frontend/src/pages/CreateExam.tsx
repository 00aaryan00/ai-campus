import { useState } from "react";
import MainLayout from "../layout/MainLayout";

export default function CreateExam() {
  const [subject, setSubject] = useState("");
  const [questionType, setQuestionType] = useState("MCQ");
  const [difficulty, setDifficulty] = useState("Medium");
  const [count, setCount] = useState(10);

  const handleGenerate = () => {
    alert("Question generation UI completed. Backend/API integration pending.");
  };

  return (
    <MainLayout>
      <h1 className="text-3xl font-bold text-yellow-400">
        Create Exam
      </h1>

      <div className="glass p-6 mt-6 space-y-5">
        <div>
          <label className="block text-gray-300 mb-2">Subject</label>
          <input
            type="text"
            placeholder="Data Structures"
            className="w-full p-3 rounded bg-gray-800 border border-white/10"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-2">Upload File</label>
          <input type="file" className="w-full text-gray-300" />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <select
            className="p-3 bg-gray-800 rounded"
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
          >
            <option>MCQ</option>
            <option>True/False</option>
          </select>

          <select
            className="p-3 bg-gray-800 rounded"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>

          <input
            type="number"
            className="p-3 bg-gray-800 rounded"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </div>

        <button
          onClick={handleGenerate}
          className="bg-yellow-400 text-black px-6 py-2 rounded"
        >
          Generate Questions
        </button>
      </div>
    </MainLayout>
  );
}