import type { ConversationDisplayResponse } from "@/types/chat"
import type { ConversationPreview } from "@/types/chat"

const API_BASE = "http://localhost:8080/api/dashboard";

export const fetchConversationPreviews = async (): Promise<ConversationPreview[]> => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE}/get-conversation-list`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.status}`);
  }

  const data: ConversationDisplayResponse[] = await response.json();

  return data.map((conv) => ({
    id: conv.id.toString(),
    title: conv.title,
    updatedAt: new Date(conv.updatedAt),
  }));
};

