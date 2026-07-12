import React, { useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Layers3,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

const entries = [
  // Size
  { term: "B", category: "Size", meaning: "Billion parameters", example: "7B", note: "Model scale marker." },
  { term: "M", category: "Size", meaning: "Million parameters", example: "350M", note: "Smaller models or embeddings." },
  { term: "T", category: "Size", meaning: "Trillion parameters", example: "1T", note: "Large frontier-scale models." },
  { term: "A3B", category: "Size", meaning: "3B active parameters", example: "A3B", note: "Common in MoE naming." },
  { term: "A4B", category: "Size", meaning: "4B active parameters", example: "A4B", note: "Common in MoE naming." },
  { term: "8x7B", category: "Size", meaning: "8 experts, 7B each", example: "Mixtral 8x7B", note: "Expert count × expert size." },
  { term: "8x22B", category: "Size", meaning: "8 experts, 22B each", example: "8x22B", note: "MoE with many experts." },
  { term: "70B", category: "Size", meaning: "70 billion parameters", example: "70B", note: "Very common open model scale." },
  { term: "32B", category: "Size", meaning: "32 billion parameters", example: "32B", note: "Popular mid-large scale." },
  { term: "14B", category: "Size", meaning: "14 billion parameters", example: "14B", note: "Common open-weight size." },
  { term: "9B", category: "Size", meaning: "9 billion parameters", example: "9B", note: "Often used in compact general models." },
  { term: "4B", category: "Size", meaning: "4 billion parameters", example: "4B", note: "Small but capable local models." },
  { term: "3B", category: "Size", meaning: "3 billion parameters", example: "3B", note: "Lightweight general models." },
  { term: "1.5B", category: "Size", meaning: "1.5 billion parameters", example: "1.5B", note: "Very small local models." },

  // Training / behavior
  { term: "Base", category: "Training", meaning: "Pretrained base model", example: "Model-Base", note: "Not instruction tuned." },
  { term: "IT", category: "Training", meaning: "Instruction tuned", example: "4B-IT", note: "Common especially in Google model naming." },
  { term: "Instruct", category: "Training", meaning: "Instruction tuned", example: "Qwen-Instruct", note: "Equivalent to IT in many repos." },
  { term: "Chat", category: "Training", meaning: "Chat optimized", example: "Model-Chat", note: "Conversation-focused tuning." },
  { term: "Assistant", category: "Training", meaning: "Assistant-style tuned", example: "Assistant", note: "Often used for chat assistants." },
  { term: "SFT", category: "Training", meaning: "Supervised fine-tuning", example: "SFT", note: "Train on input-output examples." },
  { term: "DPO", category: "Training", meaning: "Direct Preference Optimization", example: "DPO", note: "Preference alignment without explicit reward model." },
  { term: "RLHF", category: "Training", meaning: "Reinforcement Learning from Human Feedback", example: "RLHF", note: "Human preference alignment." },
  { term: "RLAIF", category: "Training", meaning: "Reinforcement Learning from AI Feedback", example: "RLAIF", note: "AI-generated feedback for alignment." },
  { term: "Distill", category: "Training", meaning: "Distilled from a larger model", example: "Distill", note: "Knowledge transferred from teacher to student." },
  { term: "Reasoner", category: "Training", meaning: "Reasoning-focused model", example: "Reasoner", note: "Often tuned for multi-step reasoning." },
  { term: "Reasoning", category: "Training", meaning: "Reasoning-focused model", example: "Reasoning", note: "Same idea as Reasoner in many names." },
  { term: "Coder", category: "Training", meaning: "Code-specialized", example: "Coder", note: "Optimized for programming tasks." },
  { term: "Math", category: "Training", meaning: "Math-specialized", example: "Math", note: "Focused on mathematical reasoning." },
  { term: "Agent", category: "Training", meaning: "Agentic / tool-use tuned", example: "Agent", note: "Often optimized for tool calling." },
  { term: "Refined", category: "Training", meaning: "Refined / post-trained", example: "Refined", note: "Marketing-style suffix in some repos." },
  { term: "Aligned", category: "Training", meaning: "Preference aligned", example: "Aligned", note: "Usually post-trained for safer outputs." },

  // Architecture
  { term: "Dense", category: "Architecture", meaning: "All parameters active", example: "Dense", note: "Classic transformer architecture." },
  { term: "MoE", category: "Architecture", meaning: "Mixture of Experts", example: "MoE", note: "Only some experts active per token." },
  { term: "MLA", category: "Architecture", meaning: "Multi-head Latent Attention", example: "MLA", note: "Used in some newer architectures." },
  { term: "GQA", category: "Architecture", meaning: "Grouped Query Attention", example: "GQA", note: "Reduces KV cache cost." },
  { term: "MQA", category: "Architecture", meaning: "Multi-Query Attention", example: "MQA", note: "Single KV head or fewer KV heads." },
  { term: "RoPE", category: "Architecture", meaning: "Rotary Position Embeddings", example: "RoPE", note: "Common positional encoding." },
  { term: "YaRN", category: "Architecture", meaning: "Context extension method", example: "YaRN", note: "Used to stretch context length." },
  { term: "MTP", category: "Architecture", meaning: "Multi-Token Prediction", example: "MTP", note: "Predicts more than one token at a time." },
  { term: "XL", category: "Architecture", meaning: "Extended context / larger than usual", example: "XL", note: "Used as a context or size hint in some names." },
  { term: "Long", category: "Architecture", meaning: "Long-context variant", example: "Long", note: "Usually signals extended context." },
  { term: "Vision", category: "Architecture", meaning: "Image-capable model", example: "Vision", note: "Can process images." },
  { term: "Audio", category: "Architecture", meaning: "Audio-capable model", example: "Audio", note: "Can process or generate audio." },
  { term: "Multimodal", category: "Architecture", meaning: "Multiple input/output modalities", example: "Multimodal", note: "Text plus image/audio/video." },

  // Quantization
  { term: "FP32", category: "Quantization", meaning: "32-bit floating point", example: "FP32", note: "Full precision." },
  { term: "FP16", category: "Quantization", meaning: "16-bit floating point", example: "FP16", note: "Half precision." },
  { term: "BF16", category: "Quantization", meaning: "Brain Float 16", example: "BF16", note: "Preferred on many modern accelerators." },
  { term: "INT8", category: "Quantization", meaning: "8-bit integer quantization", example: "INT8", note: "Common low-bit format." },
  { term: "Q8_0", category: "Quantization", meaning: "8-bit GGUF quant", example: "Q8_0", note: "Near-full precision local format." },
  { term: "Q6_K", category: "Quantization", meaning: "6-bit K quant", example: "Q6_K", note: "Good quality/speed trade-off." },
  { term: "Q5_K_M", category: "Quantization", meaning: "5-bit K quant, medium variant", example: "Q5_K_M", note: "Common local inference choice." },
  { term: "Q5_K_S", category: "Quantization", meaning: "5-bit K quant, small variant", example: "Q5_K_S", note: "Slightly smaller / lower quality." },
  { term: "Q4_K_M", category: "Quantization", meaning: "4-bit K quant, medium variant", example: "Q4_K_M", note: "Very common GGUF choice." },
  { term: "Q4_K_S", category: "Quantization", meaning: "4-bit K quant, small variant", example: "Q4_K_S", note: "Smaller than Q4_K_M." },
  { term: "Q3_K_M", category: "Quantization", meaning: "3-bit K quant, medium variant", example: "Q3_K_M", note: "For tighter memory budgets." },
  { term: "Q2_K", category: "Quantization", meaning: "2-bit K quant", example: "Q2_K", note: "Extremely compact, lower quality." },
  { term: "IQ4_XS", category: "Quantization", meaning: "Importance-aware 4-bit quant", example: "IQ4_XS", note: "Modern GGUF-style quant family." },
  { term: "AWQ", category: "Quantization", meaning: "Activation-aware Weight Quantization", example: "AWQ", note: "Weight-only low-bit quantization." },
  { term: "GPTQ", category: "Quantization", meaning: "GPT Quantization", example: "GPTQ", note: "Popular post-training quantization." },
  { term: "EXL2", category: "Quantization", meaning: "ExLlamaV2 quantization format", example: "EXL2", note: "Optimized for GPU inference." },
  { term: "GGUF", category: "Format", meaning: "GGML Unified Format", example: "GGUF", note: "Common local model format." },
  { term: "GGML", category: "Format", meaning: "Older GGML format", example: "GGML", note: "Predecessor to GGUF." },
  { term: "Safetensors", category: "Format", meaning: "Safe, zero-copy tensor format", example: "safetensors", note: "Common Hugging Face weight format." },
  { term: "ONNX", category: "Format", meaning: "Open Neural Network Exchange", example: "ONNX", note: "Portable inference format." },
  { term: "TensorRT", category: "Format", meaning: "NVIDIA optimized runtime format", example: "TensorRT", note: "Performance-focused deployment." },
  { term: "MLX", category: "Format", meaning: "Apple Silicon machine learning format/runtime", example: "MLX", note: "For Apple hardware." },

  // Fine-tuning
  { term: "LoRA", category: "Fine-tuning", meaning: "Low-Rank Adaptation", example: "LoRA", note: "Small trainable adapters." },
  { term: "QLoRA", category: "Fine-tuning", meaning: "Quantized LoRA", example: "QLoRA", note: "LoRA on a quantized base model." },
  { term: "PEFT", category: "Fine-tuning", meaning: "Parameter-Efficient Fine-Tuning", example: "PEFT", note: "Umbrella term for adapter methods." },
  { term: "Adapter", category: "Fine-tuning", meaning: "Adapter layers / adapter tuning", example: "Adapter", note: "Small trainable modules." },
  { term: "Prefix", category: "Fine-tuning", meaning: "Prefix tuning", example: "Prefix", note: "Trainable virtual prefix tokens." },
  { term: "Prompt", category: "Fine-tuning", meaning: "Prompt tuning", example: "Prompt", note: "Trainable prompt embeddings." },
  { term: "IA3", category: "Fine-tuning", meaning: "Input-aware adapter method", example: "IA3", note: "PEFT family method." },
  { term: "AdaLoRA", category: "Fine-tuning", meaning: "Adaptive LoRA", example: "AdaLoRA", note: "Rank-adaptive LoRA variant." },
  { term: "DoRA", category: "Fine-tuning", meaning: "Weight-decomposed adaptation", example: "DoRA", note: "PEFT family method." },
  { term: "LoHa", category: "Fine-tuning", meaning: "LoRA-Plus style method", example: "LoHa", note: "Adapter-family fine-tuning." },
  { term: "LoKr", category: "Fine-tuning", meaning: "Low-rank Kronecker adaptation", example: "LoKr", note: "Adapter-family fine-tuning." },

  // Inference / runtime
  { term: "llama.cpp", category: "Runtime", meaning: "Local inference runtime", example: "llama.cpp", note: "Popular for GGUF." },
  { term: "Ollama", category: "Runtime", meaning: "Local model runtime", example: "Ollama", note: "Simple model packaging and serving." },
  { term: "vLLM", category: "Runtime", meaning: "High-throughput serving engine", example: "vLLM", note: "Popular for serving APIs." },
  { term: "TGI", category: "Runtime", meaning: "Text Generation Inference", example: "TGI", note: "Hugging Face serving stack." },
  { term: "SGLang", category: "Runtime", meaning: "Serving / LLM orchestration runtime", example: "SGLang", note: "Good for structured agentic serving." },
  { term: "LM Studio", category: "Runtime", meaning: "Local desktop app/runtime", example: "LM Studio", note: "GUI for running local models." },
  { term: "OpenVINO", category: "Runtime", meaning: "Intel inference toolkit", example: "OpenVINO", note: "Intel-optimized deployment." },
  { term: "CUDA", category: "Runtime", meaning: "NVIDIA GPU compute platform", example: "CUDA", note: "Often implicit in GPU builds." },
  { term: "ROCm", category: "Runtime", meaning: "AMD GPU compute platform", example: "ROCm", note: "AMD GPU stack." },

  // Tasks / utility models
  { term: "Embed", category: "Task", meaning: "Embedding model", example: "Embed", note: "Produces vector representations." },
  { term: "Reranker", category: "Task", meaning: "Retrieval reranker", example: "Reranker", note: "Reorders search results." },
  { term: "Retriever", category: "Task", meaning: "Retrieval model", example: "Retriever", note: "Used for search / RAG." },
  { term: "ASR", category: "Task", meaning: "Automatic speech recognition", example: "ASR", note: "Speech-to-text." },
  { term: "STT", category: "Task", meaning: "Speech-to-text", example: "STT", note: "Same broad category as ASR." },
  { term: "TTS", category: "Task", meaning: "Text-to-speech", example: "TTS", note: "Speech generation." },
  { term: "OCR", category: "Task", meaning: "Optical character recognition", example: "OCR", note: "Text extraction from images." },
  { term: "VLM", category: "Task", meaning: "Vision-language model", example: "VLM", note: "Image + text understanding." },
  { term: "Agent", category: "Task", meaning: "Tool-using / agentic model", example: "Agent", note: "Often tuned for tool calls." },

  // Naming / release conventions
  { term: "Preview", category: "Release", meaning: "Preview release", example: "Preview", note: "Not final / stable." },
  { term: "Experimental", category: "Release", meaning: "Experimental release", example: "Experimental", note: "May change or break." },
  { term: "RC", category: "Release", meaning: "Release candidate", example: "RC", note: "Near-final pre-release." },
  { term: "v0", category: "Release", meaning: "Early version series", example: "v0.1", note: "Early / pre-1.0 naming." },
  { term: "Instruct-Preview", category: "Release", meaning: "Preview instruction-tuned build", example: "Instruct-Preview", note: "Common hybrid suffix." },
  { term: "Nightly", category: "Release", meaning: "Nightly build", example: "Nightly", note: "Frequent automated build." },
  { term: "Beta", category: "Release", meaning: "Beta release", example: "Beta", note: "Feature-complete but still changing." },

  // Vendor / family prefixes
  { term: "Qwen", category: "Vendor", meaning: "Alibaba model family", example: "Qwen2.5", note: "Often uses Instruct naming." },
  { term: "Gemma", category: "Vendor", meaning: "Google model family", example: "Gemma 3", note: "Often uses IT suffix." },
  { term: "Llama", category: "Vendor", meaning: "Meta model family", example: "Llama 3.1", note: "Often uses Instruct suffix." },
  { term: "Mistral", category: "Vendor", meaning: "Mistral AI model family", example: "Mistral", note: "Often uses Instruct naming." },
  { term: "DeepSeek", category: "Vendor", meaning: "DeepSeek family", example: "DeepSeek-R1", note: "Often uses Distill / Reasoner labels." },
  { term: "Phi", category: "Vendor", meaning: "Microsoft Phi family", example: "Phi-3", note: "Compact models, strong reasoning for size." },
  { term: "Granite", category: "Vendor", meaning: "IBM Granite family", example: "Granite", note: "IBM’s open model line." },
  { term: "Nemotron", category: "Vendor", meaning: "NVIDIA model family", example: "Nemotron", note: "Often optimization-focused." },
  { term: "Command", category: "Vendor", meaning: "Cohere model family", example: "Command", note: "Enterprise-focused open models." },
  { term: "Yi", category: "Vendor", meaning: "01.AI model family", example: "Yi", note: "Common open-weight family." },
];

const categories = ["All", ...Array.from(new Set(entries.map((e) => e.category)))];

const examples = [
  "google/gemma-3-4b-it",
  "Qwen3-30B-A3B-Instruct-AWQ",
  "meta-llama/Llama-3.1-8B-Instruct-GGUF-Q4_K_M",
  "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
];

function splitModelName(name) {
  return name
    .replaceAll("/", " / ")
    .replaceAll("-", " - ")
    .replaceAll("_", " _ ")
    .split(/\s+/)
    .filter(Boolean);
}

export default function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [activeExample, setActiveExample] = useState(examples[0]);
  const [showOnlyMatches, setShowOnlyMatches] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesCategory = category === "All" || e.category === category;
      const blob = `${e.term} ${e.category} ${e.meaning} ${e.example} ${e.note}`.toLowerCase();
      const matchesQuery = !q || blob.includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  const parsedExample = useMemo(() => {
    const tokens = splitModelName(activeExample);
    return tokens.map((token) => {
      const clean = token.replace(/[()]/g, "");
      const hit = entries.find((e) => e.term.toLowerCase() === clean.toLowerCase());
      return {
        token,
        hit,
      };
    });
  }, [activeExample]);

  const matchSet = new Set(parsedExample.filter((p) => p.hit).map((p) => p.hit.term.toLowerCase()));
  const visibleEntries = showOnlyMatches ? filtered.filter((e) => matchSet.has(e.term.toLowerCase())) : filtered;

  const categoryCounts = Object.fromEntries(categories.map((c) => [c, c === "All" ? entries.length : entries.filter((e) => e.category === c).length]));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">LLM Cheatsheet</div>
                <div className="text-sm text-slate-400">Model name decoder</div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                <Sparkles className="h-4 w-4" />
                <span>Search acronyms fast</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                <Layers3 className="h-4 w-4" />
                <span>Filter by category</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                <SlidersHorizontal className="h-4 w-4" />
                <span>Decode example names</span>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Sections</div>
              <div className="space-y-1 text-sm">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                      category === c ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span>{c}</span>
                    <span className="text-xs text-slate-500">{categoryCounts[c]}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-5 shadow-2xl shadow-black/20 md:p-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                    <Check className="h-3.5 w-3.5" />
                    Curated for Hugging Face / Ollama / llama.cpp style names
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">LLM model naming cheatsheet</h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                    A compact reference for the acronyms and suffixes you keep seeing in model names: size markers, tuning labels,
                    quantization formats, file formats, runtimes, and family prefixes.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px]">
                  <Stat label="Entries" value={entries.length} />
                  <Stat label="Categories" value={categories.length - 1} />
                  <Stat label="Common tokens" value="80+" />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 md:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search: GGUF, LoRA, Q4_K_M, DPO, IT, MoE..."
                    className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm outline-none ring-0 placeholder:text-slate-500 focus:border-white/20"
                  />
                </div>
                <button
                  onClick={() => setShowOnlyMatches((v) => !v)}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm transition ${
                    showOnlyMatches
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : "border-white/10 bg-black/20 text-slate-200 hover:bg-white/5"
                  }`}
                >
                  {showOnlyMatches ? <Check className="h-4 w-4" /> : <CircleHelp className="h-4 w-4" />}
                  {showOnlyMatches ? "Show example matches only" : "Highlight example matches"}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      category === c
                        ? "bg-white text-slate-950"
                        : "border border-white/10 bg-black/20 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    {c}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setQuery("");
                    setCategory("All");
                    setShowOnlyMatches(false);
                  }}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                >
                  Reset
                </button>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 md:p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Cheatsheet</h2>
                    <p className="text-sm text-slate-400">{visibleEntries.length} matching entries</p>
                  </div>
                  <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex">
                    <X className="h-3.5 w-3.5" />
                    Click categories to narrow the list
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {visibleEntries.map((entry) => {
                    const isMatch = matchSet.has(entry.term.toLowerCase());
                    return (
                      <div
                        key={`${entry.category}-${entry.term}`}
                        className={`rounded-2xl border p-4 transition ${
                          isMatch ? "border-emerald-400/30 bg-emerald-400/10" : "border-white/10 bg-black/20 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{entry.category}</div>
                            <div className="mt-1 text-xl font-semibold">{entry.term}</div>
                          </div>
                          {isMatch ? <Check className="mt-1 h-4 w-4 text-emerald-300" /> : <ChevronRight className="mt-1 h-4 w-4 text-slate-500" />}
                        </div>
                        <div className="mt-3 text-sm text-slate-200">{entry.meaning}</div>
                        <div className="mt-2 text-xs text-slate-400">
                          <span className="font-medium text-slate-300">Example:</span> {entry.example}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{entry.note}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 md:p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-300" />
                    <h2 className="text-lg font-semibold">Model decoder</h2>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {examples.map((example) => (
                      <button
                        key={example}
                        onClick={() => setActiveExample(example)}
                        className={`rounded-2xl border px-3 py-2 text-left text-xs transition ${
                          activeExample === example
                            ? "border-white/20 bg-white text-slate-950"
                            : "border-white/10 bg-black/20 text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        {example}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Parsed tokens</div>
                    <div className="flex flex-wrap gap-2">
                      {parsedExample.map((part, idx) => (
                        <div
                          key={`${part.token}-${idx}`}
                          className={`rounded-xl border px-3 py-2 text-sm ${
                            part.hit ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/5 text-slate-300"
                          }`}
                        >
                          <span className="font-mono">{part.token}</span>
                          {part.hit && <span className="ml-2 text-xs text-emerald-200">{part.hit.meaning}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    {parsedExample.filter((p) => p.hit).map((p) => (
                      <div key={p.token} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="font-medium text-white">{p.token}</div>
                        <div className="text-slate-300">{p.hit?.meaning}</div>
                        <div className="text-xs text-slate-500">{p.hit?.note}</div>
                      </div>
                    ))}
                    {parsedExample.filter((p) => p.hit).length === 0 && (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-slate-400">
                        No known tokens matched in this example.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 md:p-5">
                  <div className="mb-3 text-lg font-semibold">How to read a model name</div>
                  <ol className="space-y-3 text-sm text-slate-300">
                    <Step n="1" text="Read the family first: Llama, Qwen, Gemma, DeepSeek, Phi." />
                    <Step n="2" text="Then size: 4B, 7B, 32B, 70B, 8x7B, A3B." />
                    <Step n="3" text="Then behavior: Base, IT, Instruct, Chat, Reasoner, Coder." />
                    <Step n="4" text="Then format/quant: GGUF, safetensors, AWQ, GPTQ, Q4_K_M." />
                    <Step n="5" text="Check the runtime: llama.cpp, Ollama, vLLM, TGI, SGLang." />
                  </ol>
                </section>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
    </div>
  );
}

function Step({ n, text }) {
  return (
    <li className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">{n}</span>
      <span>{text}</span>
    </li>
  );
}
