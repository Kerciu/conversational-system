package com.conversational.system.application.entities.conversation;

import java.util.List;

import lombok.AllArgsConstructor;
import com.conversational.system.application.controllers.responses.ConversationDisplayResponse;
import com.conversational.system.application.controllers.responses.MessageDisplayResponse;
import com.conversational.system.application.entities.message.MessageRepository;
import com.conversational.system.application.entities.user.User;

import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class ConversationService {
	private final ConversationRepository conversationRepository;
	private final MessageRepository messageRepository;

	public List<ConversationDisplayResponse> getUsersConversations(Integer userId) {
		return conversationRepository
				.findAllByUserIdOrderByUpdatedAtDesc(userId)
				.stream()
				.map(
						conv -> new ConversationDisplayResponse(conv.getId(), conv.getTitle()))
				.toList();
	}

	public List<MessageDisplayResponse> getConversationHistory(Integer userId, Integer conversationId) {
		isConversationOwner(userId, conversationId);
		return messageRepository
				.findAllByConversationIdOrderByTimestampAsc(conversationId)
				.stream()
				.map(
						msg -> new MessageDisplayResponse(msg.getContent(), msg.getSender().toString()))
				.toList();
	}

	public Integer newConversation(User user, String title) {
		// todo: better title?
		try {
			Conversation conversation = new Conversation(title, user);
			conversationRepository.save(conversation);
			return conversation.getId();
		} catch (Exception e) {
			throw new RuntimeException("Error creating conversation.\n" + e.getMessage());
		}
	}

	public void deleteConversation(Integer userId, Integer conversationId) {
		try {
			isConversationOwner(userId, conversationId);
			conversationRepository.deleteById(conversationId);
		} catch (Exception e) {
			throw new RuntimeException("Error deleting conversation.\n" + e.getMessage());
		}
	}

	public void updateConversation(Integer userId, Integer conversationId, String name) {
		try {
			isConversationOwner(userId, conversationId);
			Conversation conversation = conversationRepository.findById(conversationId)
					.orElseThrow(() -> new RuntimeException("Conversation with id " + conversationId + "not found")); // TODO: WILL THIS WORK?
			conversation.setTitle(name);
			conversationRepository.save(conversation);
		} catch (Exception e) {
			throw new RuntimeException("Error updating conversation.\n" + e.getMessage());
		}
	}

	private void isConversationOwner(Integer userId, Integer conversationId) {
		Conversation conversation = conversationRepository.findById(conversationId)
				.orElseThrow(() -> new RuntimeException("Conversation with id " + conversationId + "not found"));
		if (conversation.getUser().getId() != userId)
			throw new RuntimeException("User is not authorized to update this conversation.");
	}
}
