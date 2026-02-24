import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import BASE, { API_DISCUSSIONS } from "../config";

export default function DiscussionForum({ eventId, isOrganizer }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const headers = { "x-auth-token": token };

  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [replyTo, setReplyTo] = useState(null); // message being replied to
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [newMsgNotif, setNewMsgNotif] = useState(0);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);

  // Load messages on mount
  useEffect(() => {
    fetchMessages();

    // Connect to Socket.io
    socketRef.current = io(BASE);
    socketRef.current.emit("join_event", eventId);

    // Listen for real-time events
    socketRef.current.on("new_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      setNewMsgNotif((n) => n + 1);
    });

    socketRef.current.on("message_deleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });

    socketRef.current.on("message_updated", ({ messageId, isPinned }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isPinned } : m))
      );
    });

    socketRef.current.on("message_reacted", ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    });

    return () => {
      socketRef.current.emit("leave_event", eventId);
      socketRef.current.disconnect();
    };
  }, [eventId]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_DISCUSSIONS}/${eventId}`, { headers });
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async () => {
    if (!newMsg.trim()) return;
    setError("");
    setSending(true);
    try {
      await axios.post(
        `${API_DISCUSSIONS}/${eventId}`,
        {
          content: newMsg.trim(),
          parentMessage: replyTo?._id || null,
          isAnnouncement,
        },
        { headers }
      );
      setNewMsg("");
      setReplyTo(null);
      setIsAnnouncement(false);
      // Message will arrive via socket - no need to manually append
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handlePin = async (messageId) => {
    try {
      await axios.put(`${API_DISCUSSIONS}/${messageId}/pin`, {}, { headers });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await axios.delete(`${API_DISCUSSIONS}/${messageId}`, { headers });
    } catch (err) {
      console.error(err);
    }
  };

  const EMOJIS = ["👍", "❤️", "😂", "🎉", "😮"];

  const handleReact = async (messageId, emoji) => {
    try {
      await axios.post(`${API_DISCUSSIONS}/${messageId}/react`, { emoji }, { headers });
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to get author display name
  const getAuthorName = (author) => {
    if (!author) return "Unknown";
    if (author.role === "organizer") return author.name || "Organizer";
    return `${author.firstName || ""} ${author.lastName || ""}`.trim() || "Anonymous";
  };

  // Separate pinned messages
  const pinnedMessages = messages.filter((m) => m.isPinned);
  const regularMessages = messages.filter((m) => !m.isPinned);

  // Group replies under their parent
  const topLevel = regularMessages.filter((m) => !m.parentMessage);
  const replies = {};
  regularMessages
    .filter((m) => m.parentMessage)
    .forEach((m) => {
      const parentId = typeof m.parentMessage === "object" ? m.parentMessage._id : m.parentMessage;
      if (!replies[parentId]) replies[parentId] = [];
      replies[parentId].push(m);
    });

  const renderMessage = (msg, isReply = false) => {
    const authorName = getAuthorName(msg.author);
    const isOrgMsg = msg.author?.role === "organizer";
    const isMyMsg = msg.author?._id === user.id;

    return (
      <div
        key={msg._id}
        style={{
          marginLeft: isReply ? 24 : 0,
          padding: "8px 12px",
          marginBottom: 6,
          borderRadius: 8,
          background: msg.isAnnouncement
            ? "#eff6ff"
            : msg.isPinned
            ? "#fefce8"
            : isReply
            ? "#f9fafb"
            : "#fff",
          border: msg.isAnnouncement
            ? "1px solid #bfdbfe"
            : msg.isPinned
            ? "1px solid #fde68a"
            : "1px solid #f3f4f6",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <strong style={{ fontSize: 13, color: isOrgMsg ? "#2563eb" : "#333" }}>
              {authorName}
            </strong>
            {isOrgMsg && (
              <span style={{
                fontSize: 10, padding: "1px 6px", borderRadius: 8,
                background: "#dbeafe", color: "#1d4ed8",
              }}>
                Organizer
              </span>
            )}
            {msg.isAnnouncement && (
              <span style={{
                fontSize: 10, padding: "1px 6px", borderRadius: 8,
                background: "#bfdbfe", color: "#1e40af",
              }}>
                Announcement
              </span>
            )}
            {msg.isPinned && (
              <span style={{ fontSize: 10, color: "#ca8a04" }}>📌 Pinned</span>
            )}
          </div>
          <span style={{ fontSize: 11, color: "#999" }}>
            {new Date(msg.createdAt).toLocaleString()}
          </span>
        </div>

        {/* Content */}
        <p style={{ margin: "2px 0 6px", fontSize: 14, color: "#333", whiteSpace: "pre-wrap" }}>
          {msg.content}
        </p>

        {/* Emoji Reactions */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4, alignItems: "center" }}>
          {/* Show existing reactions */}
          {msg.reactions && Object.entries(
            // reactions could be a Map-like object or plain object
            msg.reactions instanceof Map ? Object.fromEntries(msg.reactions) : msg.reactions
          ).map(([emoji, users]) => {
            if (!users || users.length === 0) return null;
            const iReacted = users.includes(user.id);
            return (
              <button
                key={emoji}
                onClick={() => handleReact(msg._id, emoji)}
                style={{
                  padding: "2px 6px", borderRadius: 12, fontSize: 13, cursor: "pointer",
                  border: iReacted ? "1px solid #4f46e5" : "1px solid #e5e7eb",
                  background: iReacted ? "#eef2ff" : "#f9fafb",
                }}
                title={`${users.length} reaction${users.length > 1 ? "s" : ""}`}
              >
                {emoji} {users.length}
              </button>
            );
          })}
          {/* Add reaction picker */}
          <span style={{ position: "relative", display: "inline-block" }}>
            <button
              onClick={(e) => {
                // Toggle a small picker
                const picker = e.currentTarget.nextSibling;
                picker.style.display = picker.style.display === "flex" ? "none" : "flex";
              }}
              style={{
                padding: "2px 6px", borderRadius: 12, fontSize: 13, cursor: "pointer",
                border: "1px dashed #ccc", background: "#fff", color: "#888",
              }}
              title="Add reaction"
            >
              +
            </button>
            <span style={{
              display: "none", position: "absolute", bottom: "100%", left: 0,
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
              padding: "4px 6px", gap: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", zIndex: 10,
            }}>
              {EMOJIS.map((em) => (
                <span
                  key={em}
                  onClick={(e) => {
                    handleReact(msg._id, em);
                    e.currentTarget.parentElement.style.display = "none";
                  }}
                  style={{ cursor: "pointer", fontSize: 18, padding: "2px 4px" }}
                >
                  {em}
                </span>
              ))}
            </span>
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
          {!isReply && (
            <span
              onClick={() => setReplyTo(msg)}
              style={{ color: "#6b7280", cursor: "pointer" }}
            >
              Reply
            </span>
          )}
          {isOrganizer && (
            <>
              <span
                onClick={() => handlePin(msg._id)}
                style={{ color: "#ca8a04", cursor: "pointer" }}
              >
                {msg.isPinned ? "Unpin" : "Pin"}
              </span>
              <span
                onClick={() => handleDelete(msg._id)}
                style={{ color: "#dc2626", cursor: "pointer" }}
              >
                Delete
              </span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ borderTop: "2px solid #e5e7eb", paddingTop: 20, marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>
          Discussion Forum
          {newMsgNotif > 0 && (
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 10,
              background: "#ef4444", color: "#fff", marginLeft: 8, verticalAlign: "middle",
            }}>
              {newMsgNotif} new
            </span>
          )}
        </h3>
        <span style={{ fontSize: 12, color: "#888" }}>{messages.length} messages</span>
      </div>

      {/* Pinned Messages */}
      {pinnedMessages.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: "#ca8a04", fontWeight: 600, marginBottom: 4 }}>
            📌 Pinned Messages
          </p>
          {pinnedMessages.map((m) => renderMessage(m))}
        </div>
      )}

      {/* Message List */}
      <div
        style={{
          maxHeight: 400, overflowY: "auto", marginBottom: 12,
          border: "1px solid #e5e7eb", borderRadius: 8, padding: 10,
        }}
        onClick={() => setNewMsgNotif(0)}
      >
        {topLevel.length === 0 && pinnedMessages.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", padding: 20 }}>
            No messages yet. Start the discussion!
          </p>
        ) : (
          topLevel.map((msg) => (
            <div key={msg._id}>
              {renderMessage(msg)}
              {/* Replies */}
              {replies[msg._id] &&
                replies[msg._id].map((reply) => renderMessage(reply, true))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "6px 12px", background: "#f3f4f6", borderRadius: "6px 6px 0 0",
          fontSize: 12, color: "#666",
        }}>
          <span>
            Replying to <strong>{getAuthorName(replyTo.author)}</strong>: "{replyTo.content.slice(0, 50)}..."
          </span>
          <span
            onClick={() => setReplyTo(null)}
            style={{ cursor: "pointer", color: "#999", fontSize: 16 }}
          >
            ✕
          </span>
        </div>
      )}

      {/* Input area */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <textarea
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={replyTo ? "Write a reply..." : "Type a message... (Enter to send, Shift+Enter for new line)"}
            rows={2}
            style={{
              width: "100%", padding: 8, border: "1px solid #ccc",
              borderRadius: replyTo ? "0 0 6px 6px" : 6,
              fontSize: 13, resize: "none", boxSizing: "border-box",
            }}
          />
          {isOrganizer && (
            <label style={{ fontSize: 12, color: "#666", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
              <input
                type="checkbox"
                checked={isAnnouncement}
                onChange={(e) => setIsAnnouncement(e.target.checked)}
              />
              Post as announcement
            </label>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={sending || !newMsg.trim()}
          style={{
            padding: "10px 20px",
            background: sending || !newMsg.trim() ? "#9ca3af" : "#4f46e5",
            color: "#fff", border: "none", borderRadius: 6,
            cursor: sending || !newMsg.trim() ? "not-allowed" : "pointer",
            fontSize: 14, fontWeight: 600, minWidth: 80,
          }}
        >
          {sending ? "..." : "Send"}
        </button>
      </div>

      {error && <p style={{ color: "red", fontSize: 13, marginTop: 4 }}>{error}</p>}
    </div>
  );
}
