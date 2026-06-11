import { Bot, Send, Sparkles, UserRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { sendChatMessage } from '../lib/api';
import type { BudgetInput, ChatMessage } from '../types/budget';

interface ChatbotProps {
  budget: BudgetInput;
}

const STARTER_PROMPTS = [
  'Where should I cut spending first?',
  'How can I reach my savings goal faster?',
  'Is my debt payment manageable?',
  'Explain the biggest tradeoff in this budget.'
];

export function Chatbot({ budget }: ChatbotProps) {
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hi! I can analyze your budget, explain spending tradeoffs, and suggest realistic changes. Ask me about savings, debt, or categories to reduce.'
    }
  ]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [usedLlm, setUsedLlm] = useState<boolean | null>(null);

  const submitMessage = async (event?: FormEvent<HTMLFormElement>, override?: string) => {
    event?.preventDefault();
    const nextMessage = (override ?? message).trim();
    if (!nextMessage || loading) return;

    const nextHistory: ChatMessage[] = [...history, { role: 'user', content: nextMessage }];
    setHistory(nextHistory);
    setMessage('');
    setLoading(true);

    try {
      const response = await sendChatMessage(nextMessage, budget, nextHistory);
      setHistory([...nextHistory, { role: 'assistant', content: response.reply }]);
      setActions(response.suggested_actions);
      setUsedLlm(response.used_llm);
    } catch (error) {
      setHistory([
        ...nextHistory,
        {
          role: 'assistant',
          content:
            error instanceof Error
              ? `I could not reach the budgeting API: ${error.message}`
              : 'I could not reach the budgeting API.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel chatbot-panel">
      <div className="section-header compact">
        <div>
          <span className="eyebrow">AI assistant</span>
          <h2>Budget Coach Chat</h2>
        </div>
        <span className="llm-badge">
          <Sparkles size={14} /> {usedLlm ? 'LLM enabled' : 'Rule fallback'}
        </span>
      </div>

      <div className="starter-prompts">
        {STARTER_PROMPTS.map((prompt) => (
          <button key={prompt} type="button" onClick={() => submitMessage(undefined, prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <div className="chat-window">
        {history.map((item, index) => (
          <div className={`chat-message ${item.role}`} key={`${item.role}-${index}`}>
            <span className="avatar">{item.role === 'assistant' ? <Bot size={17} /> : <UserRound size={17} />}</span>
            <p>{item.content}</p>
          </div>
        ))}
        {loading && (
          <div className="chat-message assistant">
            <span className="avatar"><Bot size={17} /></span>
            <p>Thinking through your budget...</p>
          </div>
        )}
      </div>

      {actions.length > 0 && (
        <div className="action-box">
          <strong>Suggested next actions</strong>
          <ul>
            {actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      )}

      <form className="chat-form" onSubmit={submitMessage}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask about your spending, savings, debt, or tradeoffs..."
        />
        <button type="submit" disabled={loading}>
          <Send size={17} />
        </button>
      </form>
    </section>
  );
}
