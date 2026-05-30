import React, { useState, useRef, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  Sparkles, X, Send, Brain, ArrowRightLeft, 
  CheckCircle, AlertCircle, PlusCircle, Info
} from 'lucide-react';
import { CATEGORIES, getCategory, formatMoney } from '../utils/constants';

export const AIAssistantBubble = () => {
  const { 
    mimoApiKey, 
    setMimoApiKey, 
    mimoModel, 
    wallets, 
    transactions,
    addTransaction,
    transferWallet,
    currency
  } = useFinance();

  const [isOpen, setIsOpen] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [messages, setMessages] = useState([
    { 
      id: 'welcome', 
      role: 'assistant', 
      content: 'สวัสดีครับ! ผมคือผู้ช่วย AI ส่วนตัวของคุณ สามารถพิมพ์จดบันทึกรายรับรายจ่ายด้วยภาษากาย เช่น "กินข้าวแกงไป 60 บาท" หรือถามสุขภาพการเงินได้เลยครับ!'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Initial key binding
  useEffect(() => {
    if (mimoApiKey) {
      setInputKey(mimoApiKey);
    }
  }, [mimoApiKey]);

  // Quick Action Chips
  const SUGGESTION_CHIPS = [
    { label: '🍔 กินข้าว 60 บาท', text: 'กินข้าวไป 60 บาท' },
    { label: '💰 เงินปันผลเข้า 1,200', text: 'ได้รับเงินปันผล 1,200 บาท' },
    { label: '🔄 โอนเงินสดเข้าธนาคาร 500', text: 'โอนเงินสดเข้าบัญชีธนาคาร 500 บาท' },
    { label: '📊 ขอวิธีออมเงินรายเดือน', text: 'ช่วยแนะนำแนวทางการออมเงินเดือนนี้ให้หน่อยครับ' }
  ];

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    if (inputKey.trim()) {
      setMimoApiKey(inputKey.trim());
      setMessages(prev => [
        ...prev, 
        { 
          id: `sys-${Date.now()}`, 
          role: 'assistant', 
          content: 'บันทึก API Key สำเร็จแล้ว! พร้อมให้บริการแล้วครับ พิมพ์คำสั่งได้เลย'
        }
      ]);
    }
  };

  const handleSendMessage = async (e, customText = '') => {
    if (e) e.preventDefault();
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    if (!mimoApiKey) {
      setMessages(prev => [
        ...prev,
        { id: `user-${Date.now()}`, role: 'user', content: textToSend },
        { id: `err-${Date.now()}`, role: 'assistant', content: 'กรุณากรอก Mimo API Key ก่อนใช้งานครับ' }
      ]);
      setInputMessage('');
      return;
    }

    const userMessageId = `user-${Date.now()}`;
    setMessages(prev => [...prev, { id: userMessageId, role: 'user', content: textToSend }]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Calculate current summary for context
      const totalBalance = transactions.reduce((sum, tx) => {
        if (tx.isTransfer) return sum; // transfer doesn't change net
        if (tx.type === 'income') return sum + tx.amount;
        if (tx.type === 'expense') return sum - tx.amount;
        if (tx.type === 'saving') return sum - tx.amount; // saving deducts cash flow
        return sum;
      }, 0);

      const recentTxsStr = transactions.slice(0, 10).map(t => {
        const cat = getCategory(t.type, t.category);
        const wallet = wallets.find(w => w.id === t.walletId)?.name || 'เงินสด';
        return `- วันที่: ${t.date}, ประเภท: ${t.type === 'income' ? 'รายรับ' : t.type === 'expense' ? 'รายจ่าย' : 'เงินออม'}, หมวดหมู่: ${cat.label}, จำนวน: ${t.amount} ${currency}, กระเป๋า: ${wallet}, โน้ต: ${t.note || ''}`;
      }).join('\n');

      const walletsStr = wallets.map(w => `- ID: "${w.id}", ชื่อกระเป๋า: "${w.name}"`).join('\n');
      
      const incomeCategoriesStr = CATEGORIES.income.map(c => `- ID: "${c.id}", ชื่อหมวดหมู่: "${c.label}"`).join('\n');
      const expenseCategoriesStr = CATEGORIES.expense.map(c => `- ID: "${c.id}", ชื่อหมวดหมู่: "${c.label}"`).join('\n');
      const savingCategoriesStr = CATEGORIES.saving.map(c => `- ID: "${c.id}", ชื่อหมวดหมู่: "${c.label}"`).join('\n');

      const systemPrompt = `You are an expert AI Financial Assistant for a family finance app called "Money Nitro".
The user will input financial actions in natural language (mostly in Thai).
Your job is to parse their request into a structured JSON action and provide a helpful response.

Current date: ${new Date().toISOString().split('T')[0]} (today).
Current account status:
- Net Balance: ${totalBalance} ${currency}
- Active Wallets:
${walletsStr}
- Recent Transactions (up to 10):
${recentTxsStr}

Available categories for income:
${incomeCategoriesStr}
Available categories for expense:
${expenseCategoriesStr}
Available categories for saving:
${savingCategoriesStr}

Your output must be a valid JSON object matching the schema below. Do not output any markdown code blocks, headers, tags or wrapper text outside the JSON. Return only the JSON object.

JSON Schema:
{
  "action": "add_transaction" | "transfer" | "ask_info" | "chat",
  "transaction": { // Required only if action === "add_transaction"
    "type": "income" | "expense" | "saving",
    "category": "<category_id>", // Map to the best matching category ID
    "amount": <number>, // Must be a positive number
    "note": "<string>", // Clean description of the transaction
    "walletId": "<wallet_id>", // Map to the best matching wallet ID from active wallets, default to the first wallet if not specified
    "date": "YYYY-MM-DD" // Defaults to today's date if not specified, otherwise parse from context
  },
  "transfer": { // Required only if action === "transfer"
    "fromWalletId": "<wallet_id>", // Source wallet ID
    "toWalletId": "<wallet_id>", // Destination wallet ID
    "amount": <number>, // Must be a positive number
    "note": "<string>", // Description of transfer, e.g. "โอนเงินเข้าธนาคาร"
    "date": "YYYY-MM-DD" // Defaults to today's date
  },
  "reply": "<string>" // A helpful, friendly explanation in Thai of what was done, or an answer to the user's financial question or financial advice.
}`;

      const targetUrl = mimoApiKey.startsWith('sk-')
        ? 'https://api.xiaomimimo.com/v1/chat/completions'
        : 'https://token-plan-sgp.xiaomimimo.com/v1/chat/completions';

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mimoApiKey}`
        },
        body: JSON.stringify({
          model: mimoModel || 'mimo-v2.5-pro',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: textToSend }
          ],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const responseData = await response.json();
      const content = responseData.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('API returned empty response');
      }

      // Parse JSON from response content safely
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
      }
      
      const parsedData = JSON.parse(cleanedContent);
      
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: parsedData.reply || 'วิเคราะห์ข้อมูลเสร็จสิ้นแล้วครับ',
          action: parsedData.action,
          transaction: parsedData.transaction,
          transfer: parsedData.transfer,
          status: 'pending' // pending user confirmation
        }
      ]);

    } catch (error) {
      console.error('Error calling Mimo AI API:', error);
      setMessages(prev => [
        ...prev,
        { 
          id: `ai-err-${Date.now()}`, 
          role: 'assistant', 
          content: `เกิดข้อผิดพลาดในการประมวลผล: ${error.message || 'กรุณาตรวจสอบความถูกต้องของ API Key และการเชื่อมต่ออินเทอร์เน็ต'}` 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = (msgId) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === msgId) {
        if (msg.action === 'add_transaction' && msg.transaction) {
          const success = addTransaction(msg.transaction);
          return { 
            ...msg, 
            status: success ? 'confirmed' : 'failed', 
            content: success ? `${msg.content} (บันทึกข้อมูลเรียบร้อยแล้ว)` : 'ไม่สามารถบันทึกธุรกรรมได้ เนื่องจากข้อมูลไม่สมบูรณ์'
          };
        }
        if (msg.action === 'transfer' && msg.transfer) {
          const success = transferWallet(msg.transfer);
          return { 
            ...msg, 
            status: success ? 'confirmed' : 'failed', 
            content: success ? `${msg.content} (โอนเงินระหว่างกระเป๋าสำเร็จ)` : 'ไม่สามารถโอนเงินได้ เนื่องจากข้อมูลกระเป๋าเงินไม่ถูกต้อง'
          };
        }
      }
      return msg;
    }));
  };

  const handleRejectAction = (msgId) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === msgId) {
        return { 
          ...msg, 
          status: 'rejected',
          content: 'ยกเลิกการบันทึกรายการดังกล่าวแล้วครับ'
        };
      }
      return msg;
    }));
  };

  return (
    <>
      {/* Floating Sparkles Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 md:bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-blue-500/20 z-50 border border-blue-400/20 active:scale-95 transition-all group no-print"
      >
        {isOpen ? (
          <X size={24} className="animate-spin-custom duration-300" />
        ) : (
          <div className="relative">
            <Sparkles size={24} className="group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-indigo-600 animate-[pulse-glow_2s_infinite]"></span>
          </div>
        )}
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="fixed bottom-36 md:bottom-24 right-6 w-[calc(100vw-32px)] sm:w-[380px] h-[500px] rounded-3xl border border-[color:var(--border-color)] bg-[color:var(--bg-secondary)]/95 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden z-50 animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)] no-print">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border-b border-[color:var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                <Brain size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-[color:var(--text-primary)] flex items-center gap-1.5">
                  Money Nitro AI
                  <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                    Mimo AI
                  </span>
                </h4>
                <p className="text-[10px] text-[color:var(--text-secondary)] mt-0.5 font-medium">พร้อมช่วยเหลือ 24 ชั่วโมง</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-card-hover)] hover:text-[color:var(--text-primary)] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => {
              const isAI = msg.role === 'assistant';
              return (
                <div key={msg.id} className={`flex flex-col ${isAI ? 'items-start' : 'items-end'} space-y-1`}>
                  <span className="text-[9px] text-[color:var(--text-muted)] font-bold px-1 uppercase tracking-wider">
                    {isAI ? 'Money Nitro AI' : 'คุณ'}
                  </span>
                  
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    isAI 
                      ? 'bg-[color:var(--bg-card)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] shadow-sm' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  }`}>
                    {msg.content}
                  </div>

                  {/* Render Parsed Actions & Confirmation Card */}
                  {isAI && msg.action && msg.status === 'pending' && (
                    <div className="w-[85%] mt-2 p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-3 shadow-inner">
                      <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[10px] uppercase tracking-wider">
                        {msg.action === 'add_transaction' ? <PlusCircle size={14} /> : <ArrowRightLeft size={14} />}
                        {msg.action === 'add_transaction' ? 'ตรวจพบรายการใหม่' : 'ตรวจพบการโอนเงิน'}
                      </div>
                      
                      {msg.action === 'add_transaction' && msg.transaction && (
                        <div className="bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] p-2.5 rounded-xl text-[11px] space-y-1">
                          <div className="flex justify-between">
                            <span className="text-[color:var(--text-secondary)]">ประเภท:</span>
                            <span className={`font-black ${
                              msg.transaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {msg.transaction.type === 'income' ? 'รายรับ' : msg.transaction.type === 'expense' ? 'รายจ่าย' : 'เงินออม'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[color:var(--text-secondary)]">หมวดหมู่:</span>
                            <span className="font-bold text-[color:var(--text-primary)]">
                              {getCategory(msg.transaction.type, msg.transaction.category).label}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[color:var(--text-secondary)]">จำนวนเงิน:</span>
                            <span className="font-black text-[color:var(--text-primary)]">
                              {formatMoney(msg.transaction.amount, currency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[color:var(--text-secondary)]">กระเป๋าเงิน:</span>
                            <span className="font-bold text-[color:var(--text-primary)]">
                              {wallets.find(w => w.id === msg.transaction.walletId)?.name || 'เงินสด'}
                            </span>
                          </div>
                          {msg.transaction.note && (
                            <div className="flex justify-between">
                              <span className="text-[color:var(--text-secondary)]">หมายเหตุ:</span>
                              <span className="text-[color:var(--text-primary)] truncate max-w-[120px]">{msg.transaction.note}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {msg.action === 'transfer' && msg.transfer && (
                        <div className="bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] p-2.5 rounded-xl text-[11px] space-y-1">
                          <div className="flex justify-between">
                            <span className="text-[color:var(--text-secondary)]">โอนจาก:</span>
                            <span className="font-bold text-rose-400">
                              {wallets.find(w => w.id === msg.transfer.fromWalletId)?.name || 'เงินสด'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[color:var(--text-secondary)]">ไปยัง:</span>
                            <span className="font-bold text-emerald-400">
                              {wallets.find(w => w.id === msg.transfer.toWalletId)?.name || 'กสิกร'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[color:var(--text-secondary)]">จำนวนเงิน:</span>
                            <span className="font-black text-[color:var(--text-primary)]">
                              {formatMoney(msg.transfer.amount, currency)}
                            </span>
                          </div>
                          {msg.transfer.note && (
                            <div className="flex justify-between">
                              <span className="text-[color:var(--text-secondary)]">หมายเหตุ:</span>
                              <span className="text-[color:var(--text-primary)] truncate max-w-[120px]">{msg.transfer.note}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConfirmAction(msg.id)}
                          className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[10px] py-1.5 rounded-lg border-none flex items-center justify-center gap-1 active:scale-95 transition-all shadow-md"
                        >
                          <CheckCircle size={10} /> บันทึกข้อมูล
                        </button>
                        <button
                          onClick={() => handleRejectAction(msg.id)}
                          className="flex-1 bg-[color:var(--bg-card)] hover:bg-[color:var(--bg-card-hover)] border border-[color:var(--border-color)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] font-bold text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-all"
                        >
                          <AlertCircle size={10} /> ยกเลิก
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* AI Typing Indicator */}
            {isLoading && (
              <div className="flex flex-col items-start space-y-1">
                <span className="text-[9px] text-[color:var(--text-muted)] font-bold px-1 uppercase tracking-wider">Money Nitro AI</span>
                <div className="bg-[color:var(--bg-card)] border border-[color:var(--border-color)] rounded-2xl px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick suggestions area */}
          <div className="px-4 py-2 border-t border-[color:var(--border-color)] bg-[color:var(--bg-secondary)] overflow-x-auto flex gap-2 no-scrollbar shrink-0 select-none">
            {SUGGESTION_CHIPS.map((chip, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(null, chip.text)}
                className="shrink-0 bg-[color:var(--bg-card)] hover:bg-[color:var(--bg-card-hover)] border border-[color:var(--border-color)] hover:border-blue-500/30 text-[10px] px-2.5 py-1.5 rounded-full text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-all font-medium"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Setup API key Card if not configured */}
          {!mimoApiKey && (
            <form onSubmit={handleSaveApiKey} className="p-4 border-t border-[color:var(--border-color)] bg-cyan-950/20 space-y-3 shrink-0">
              <div className="flex items-start gap-2 text-[10px] text-cyan-300 leading-relaxed font-medium">
                <Info size={12} className="shrink-0 mt-0.5" />
                <p>เปิดใช้งานการสนทนาและบันทึกข้อมูลอัจฉริยะโดยป้อน API Key ของ Mimo</p>
              </div>
              <div className="flex gap-2">
                <input 
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="ป้อน API Key..."
                  className="flex-1 bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-3 py-2 text-xs text-[color:var(--text-primary)] focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-3 rounded-xl flex items-center justify-center border-none"
                >
                  บันทึก
                </button>
              </div>
            </form>
          )}

          {/* Send Input Message Form */}
          {mimoApiKey && (
            <form onSubmit={handleSendMessage} className="p-3 border-t border-[color:var(--border-color)] flex gap-2 items-center bg-[color:var(--bg-secondary)] shrink-0">
              <input 
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="พิมพ์พูดคุยกับ AI บันทึกธุรกรรม..."
                className="flex-1 bg-[color:var(--bg-card)] border border-[color:var(--border-color)] focus:border-blue-500/60 rounded-xl px-3.5 py-2.5 text-xs text-[color:var(--text-primary)] focus:outline-none transition-colors"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center disabled:opacity-40 disabled:hover:bg-blue-600 active:scale-95 border-none transition-all shadow-md shadow-blue-500/10 shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
};
