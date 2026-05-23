"use client";

import React, { useState } from "react";
import { 
  Upload, 
  FileText, 
  ChevronRight, 
  Loader2, 
  CheckCircle2, 
  BrainCircuit,
  Zap,
  Layers
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Question {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: string;
  difficulty: string;
  marks: number;
}

interface TestData {
  mode: "same" | "adaptive";
  questions?: Question[];
  easy?: Question[];
  medium?: Question[];
  hard?: Question[];
}

export default function Home() {
  const [transcript, setTranscript] = useState("");
  const [mode, setMode] = useState<"same" | "adaptive">("same");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!transcript.trim()) {
      setError("Please provide a transcript first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const endpoint = mode === "same" ? "/generate-same-test" : "/generate-rankwise-test";
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate test: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred during generation.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setTranscript(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white/70">
            <BrainCircuit className="w-4 h-4 text-purple-400" />
            AI Question Service
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight gradient-text">
            ACIS AI Question Generator
          </h1>
          <p className="text-lg text-white/50 max-w-2xl">
            Transform transcripts into high-quality MCQ tests in seconds using advanced AI logic.
          </p>
        </div>

        {/* Input Section */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/70">Transcript Content</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center gap-2 text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload .txt
                  </label>
                </div>
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste your transcript here..."
                className="w-full h-64 bg-white/5 border border-white/10 rounded-xl p-4 text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 space-y-6">
              <div className="space-y-4">
                <label className="text-sm font-medium text-white/70">Test Generation Mode</label>
                <div className="space-y-3">
                  <button
                    onClick={() => setMode("same")}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                      mode === "same" 
                        ? "bg-purple-500/10 border-purple-500/50 text-purple-200" 
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Zap className={cn("w-5 h-5", mode === "same" ? "text-purple-400" : "text-white/40")} />
                      <div>
                        <div className="font-medium text-sm">Same Test</div>
                        <div className="text-[10px] opacity-60">15 MCQs for everyone</div>
                      </div>
                    </div>
                    {mode === "same" && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                  </button>

                  <button
                    onClick={() => setMode("adaptive")}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                      mode === "adaptive" 
                        ? "bg-blue-500/10 border-blue-500/50 text-blue-200" 
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Layers className={cn("w-5 h-5", mode === "adaptive" ? "text-blue-400" : "text-white/40")} />
                      <div>
                        <div className="font-medium text-sm">Rank Wise Adaptive</div>
                        <div className="text-[10px] opacity-60">3 levels (Easy, Med, Hard)</div>
                      </div>
                    </div>
                    {mode === "adaptive" && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || !transcript}
                className={cn(
                  "w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
                  loading 
                    ? "bg-white/10 text-white/40 cursor-not-allowed" 
                    : "bg-white text-black hover:bg-white/90 active:scale-[0.98]"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Test
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
              
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            {result.mode === "same" ? (
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                    <CheckCircle2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold">Standard Test Result</h2>
                </div>
                <div className="grid gap-6">
                  {result.questions?.map((q, idx) => (
                    <QuestionCard key={idx} question={q} index={idx} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-16">
                <AdaptiveSection title="Hard Test" questions={result.hard} color="red" />
                <AdaptiveSection title="Medium Test" questions={result.medium} color="yellow" />
                <AdaptiveSection title="Easy Test" questions={result.easy} color="green" />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function AdaptiveSection({ title, questions, color }: { title: string, questions?: Question[], color: string }) {
  const colorClasses: Record<string, string> = {
    red: "bg-red-500/20 border-red-500/30 text-red-400",
    yellow: "bg-yellow-500/20 border-yellow-500/30 text-yellow-400",
    green: "bg-green-500/20 border-green-500/30 text-green-400"
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className={cn("px-4 py-1.5 rounded-full text-sm font-bold border uppercase tracking-wider", colorClasses[color])}>
          {title}
        </div>
      </div>
      <div className="grid gap-6">
        {questions?.map((q, idx) => (
          <QuestionCard key={idx} question={q} index={idx} />
        ))}
      </div>
    </div>
  );
}

function QuestionCard({ question, index }: { question: Question; index: number }) {
  return (
    <div className="glass rounded-2xl p-6 space-y-4 hover:border-white/20 transition-all group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <span className="text-white/20 font-mono text-xl">{(index + 1).toString().padStart(2, '0')}</span>
          <h3 className="text-lg font-medium text-white/90 leading-snug">{question.question}</h3>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50 uppercase tracking-widest">
            {question.difficulty}
          </span>
          <span className="text-xs font-bold text-white/30">{question.marks} PTS</span>
        </div>
      </div>
      
      <div className="grid sm:grid-cols-2 gap-3 pl-10">
        {Object.entries(question.options).map(([key, value]) => (
          <div 
            key={key}
            className={cn(
              "p-3 rounded-xl border text-sm transition-all",
              question.correct_answer === key 
                ? "bg-green-500/10 border-green-500/40 text-green-200" 
                : "bg-white/5 border-white/10 text-white/60"
            )}
          >
            <span className="font-bold mr-3 opacity-50">{key}.</span>
            {value}
            {question.correct_answer === key && (
              <CheckCircle2 className="w-4 h-4 text-green-500 inline ml-2 mb-0.5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
