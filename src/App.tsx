/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, Sparkles, BarChart3, Send, User, Shirt, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { evaluateOutfit, synthesizeOutfit, customRequest, EvaluationResult } from './lib/gemini';

export default function App() {
  const [userImage, setUserImage] = useState<string | null>(null);
  const [clothingImage, setClothingImage] = useState<string | null>(null);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [customAdvice, setCustomAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');

  const userFileRef = useRef<HTMLInputElement>(null);
  const clothingFileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'user' | 'clothing') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'user') {
          setUserImage(base64);
          setDisplayImage(base64);
        } else {
          setClothingImage(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const onEvaluate = async () => {
    if (!userImage) return;
    setLoading(true);
    try {
      const result = await evaluateOutfit(userImage.split(',')[1]);
      setEvaluation(result);
      setCustomAdvice(null);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "";
      if (message.includes("API key") || message.includes("403") || message.includes("permission")) {
        setCustomAdvice("Gemini API 키 권한 오류가 발생했습니다. 설정(Settings)에서 API 키가 올바르게 등록되어 있는지 확인해주세요.");
      } else {
        setCustomAdvice("평가 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onSynthesize = async () => {
    if (!userImage || !clothingImage) return;
    setLoading(true);
    try {
      const resultImage = await synthesizeOutfit(userImage, clothingImage);
      setDisplayImage(resultImage);
      setEvaluation(null);
      setCustomAdvice("의상 합성이 완료되었습니다. 새로운 스타일을 확인해보세요!");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "";
      if (message.includes("API key") || message.includes("403") || message.includes("permission")) {
        setCustomAdvice("Gemini API 키 권한 오류가 발생했습니다. 설정(Settings)에서 API 키가 올바르게 등록되어 있는지 확인해주세요.");
      } else {
        setCustomAdvice(message || "의상 합성 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onCustomRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt || !userImage) return;
    setLoading(true);
    try {
      const base64Data = (displayImage || userImage).split(',')[1];
      const result = await customRequest(base64Data, prompt);
      if (result.image) setDisplayImage(result.image);
      setCustomAdvice(result.advice);
      setPrompt('');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onReset = () => {
    setUserImage(null);
    setClothingImage(null);
    setDisplayImage(null);
    setEvaluation(null);
    setCustomAdvice(null);
    setPrompt('');
    if (userFileRef.current) userFileRef.current.value = '';
    if (clothingFileRef.current) clothingFileRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#2563EB] flex items-center gap-2">
          <Sparkles className="w-6 h-6" />
          AI 면접 코디네이터
        </h1>
        <button 
          onClick={onReset}
          className="text-xs font-bold text-[#64748B] hover:text-[#EF4444] transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-[#FEF2F2]"
        >
          초기화
        </button>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Upload Section */}
        <div className="grid grid-cols-2 gap-4">
          <div 
            onClick={() => userFileRef.current?.click()}
            className="aspect-square bg-white border-2 border-dashed border-[#CBD5E1] rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-[#2563EB] transition-colors overflow-hidden relative"
          >
            {userImage ? (
              <img src={userImage} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <>
                <User className="w-8 h-8 text-[#64748B] mb-2" />
                <span className="text-xs font-medium text-[#64748B]">나의 사진</span>
              </>
            )}
            <input type="file" ref={userFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'user')} />
          </div>

          <div 
            onClick={() => clothingFileRef.current?.click()}
            className="aspect-square bg-white border-2 border-dashed border-[#CBD5E1] rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-[#2563EB] transition-colors overflow-hidden relative"
          >
            {clothingImage ? (
              <img src={clothingImage} alt="Clothing" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <>
                <Shirt className="w-8 h-8 text-[#64748B] mb-2" />
                <span className="text-xs font-medium text-[#64748B]">의상 사진</span>
              </>
            )}
            <input type="file" ref={clothingFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'clothing')} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button 
            onClick={onEvaluate}
            disabled={!userImage || loading}
            className="flex-1 bg-white border border-[#E2E8F0] text-[#1E293B] py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm hover:bg-[#F1F5F9] transition-all disabled:opacity-50"
          >
            <BarChart3 className="w-5 h-5 text-[#2563EB]" />
            현재 복장 평가
          </button>
          <button 
            onClick={onSynthesize}
            disabled={!userImage || !clothingImage || loading}
            className="flex-1 bg-[#2563EB] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:bg-[#1D4ED8] transition-all disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" />
            새로운 의상 합성
          </button>
        </div>

        {/* Main Canvas */}
        <div className="relative aspect-[3/4] bg-white rounded-3xl shadow-xl overflow-hidden border border-[#E2E8F0]">
          <AnimatePresence mode="wait">
            {displayImage ? (
              <motion.img 
                key={displayImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                src={displayImage} 
                alt="Main Display" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#94A3B8]">
                사진을 업로드해주세요
              </div>
            )}
          </AnimatePresence>
          
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-[#2563EB] animate-spin" />
                <span className="text-sm font-medium text-[#2563EB]">AI가 분석 중입니다...</span>
              </div>
            </div>
          )}
        </div>

        {/* Result Report */}
        <div className="space-y-4">
          {evaluation && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Dark Styled Score Card */}
              <div className="bg-[#1A1A1A] p-6 rounded-3xl shadow-2xl text-white relative overflow-hidden">
                <div className="absolute top-6 right-6 bg-[#333333] p-2 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-white opacity-80" />
                </div>
                
                <div className="space-y-1 mb-6">
                  <h3 className="text-[10px] font-black text-[#888888] uppercase tracking-[0.2em]">Professionalism Score</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-serif italic">{evaluation.score}</span>
                    <span className="text-lg text-[#666666]">/100</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {evaluation.tags?.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-[#333333] border border-[#444444] rounded-full text-[11px] font-bold text-white flex items-center gap-1">
                      <span className="opacity-50">#</span> {tag.replace('#', '')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Detailed Analysis Cards */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E2E8F0]">
                <h3 className="text-sm font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Silhouette Evaluation
                </h3>
                <p className="text-[#334155] leading-relaxed text-sm">{evaluation.silhouette}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E2E8F0]">
                <h3 className="text-sm font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Stylist's Advice
                </h3>
                <p className="text-[#334155] leading-relaxed text-sm">{evaluation.advice}</p>
              </div>
            </motion.div>
          )}

          {customAdvice && !evaluation && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-2xl shadow-sm border border-[#E2E8F0]"
            >
              <h3 className="text-sm font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Stylist Feedback
              </h3>
              <p className="text-[#334155] leading-relaxed text-sm">{customAdvice}</p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Custom Styling Request Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4 pb-8 z-20">
        <form onSubmit={onCustomRequest} className="max-w-md mx-auto relative">
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="💡 Custom Styling Request (예: 넥타이 색 바꿔줘)"
            className="w-full bg-[#F1F5F9] border-none rounded-2xl py-4 pl-5 pr-14 focus:ring-2 focus:ring-[#2563EB] transition-all outline-none text-sm"
          />
          <button 
            type="submit"
            disabled={!prompt || !userImage || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#2563EB] text-white p-2 rounded-xl hover:bg-[#1D4ED8] transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
