package com.conversational.system.application.entities.conversation;

import java.util.List;

import lombok.AllArgsConstructor;
import com.conversational.system.application.controllers.responses.ConversationDisplayResponse;
import com.conversational.system.application.controllers.responses.MessageDisplayResponse;
import com.conversational.system.application.entities.message.Message;
import com.conversational.system.application.entities.message.MessageRepository;
import com.conversational.system.application.entities.message.Sender;
import com.conversational.system.application.entities.user.User;

import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@AllArgsConstructor
public class ConversationService {
	private final ConversationRepository conversationRepository;
	private final MessageRepository messageRepository;

	public List<ConversationDisplayResponse> getUsersConversations(Integer userId) {
		try {
			return conversationRepository
					.findAllByUserIdOrderByUpdatedAtDesc(userId)
					.stream()
					.map(
							conv -> new ConversationDisplayResponse(conv.getId(), conv.getTitle(), conv.getUpdatedAt()))
					.toList();

		} catch (Exception e) {
			log.error(e.getMessage());
			throw new RuntimeException("Error getting conversations.\n" + e.getMessage());
		}
	}

	public List<MessageDisplayResponse> getConversationHistory(Integer userId, Integer conversationId) {
		try {
			isConversationOwner(userId, conversationId);
			return messageRepository
					.findAllByConversationIdOrderByTimestampAsc(conversationId)
					.stream()
					.map(
							msg -> new MessageDisplayResponse(msg.getId(), msg.getSender().toString(), msg.getContent(),
									msg.getTimestamp().toString()))
					.toList();
		} catch (Exception e) {
			log.error(e.getMessage());
			throw new RuntimeException("Error getting conversation history.\n" + e.getMessage());
		}
	}

	public Integer newConversation(User user, String title) {
		// TODO: better title
		try {
			Conversation conversation = new Conversation(title, user);
			conversationRepository.save(conversation);
			return conversation.getId();
		} catch (Exception e) {
			log.error(e.getMessage());
			throw new RuntimeException("Error creating conversation.\n" + e.getMessage());
		}
	}

	public void deleteConversation(Integer userId, Integer conversationId) {
		try {
			isConversationOwner(userId, conversationId);
			conversationRepository.deleteById(conversationId);
		} catch (Exception e) {
			log.error(e.getMessage());
			throw new RuntimeException("Error deleting conversation.\n" + e.getMessage());
		}
	}

	public void renameConversation(Integer userId, Integer conversationId, String name) {
		try {
			isConversationOwner(userId, conversationId);
			if (name == null || name.isEmpty())
				throw new RuntimeException("Conversation name cannot be empty.");
			Conversation conversation = conversationRepository.findById(conversationId)
					.orElseThrow(() -> new RuntimeException("Conversation with id " + conversationId + "not found"));
			conversation.setTitle(name);
			conversationRepository.save(conversation);
		} catch (Exception e) {
			log.error(e.getMessage());
			throw new RuntimeException("Error renaming conversation to " + name + ".\n" + e.getMessage());
		}
	}

	public void saveUserMessage(Integer conversationId, Integer userId, String content) {
		try {
			isConversationOwner(userId, Integer.valueOf(conversationId));
			Conversation conversation = conversationRepository.findById(conversationId)
					.orElseThrow(() -> new RuntimeException("Conversation with id " + conversationId + "not found"));
			Message message = new Message(content, conversation, Sender.USER);
			messageRepository.save(message);
		} catch (Exception e) {
			log.error(e.getMessage());
			throw new RuntimeException("Error saving user message.\n" + e.getMessage());
		}
	}

	public void saveAgentMessage(Integer conversationId, String content) {
		try {
			Conversation conversation = conversationRepository.findById(conversationId)
					.orElseThrow(() -> new RuntimeException("Conversation with id " + conversationId + "not found"));
			Message message = new Message(content, conversation, Sender.AGENT);
			messageRepository.save(message);
		} catch (Exception e) {
			log.error(e.getMessage());
			throw new RuntimeException("Error saving agent message.\n" + e.getMessage());
		}
	}

	private void isConversationOwner(Integer userId, Integer conversationId) {
		try {
			Conversation conversation = conversationRepository.findById(conversationId)
					.orElseThrow(() -> new RuntimeException("Conversation with id " + conversationId + "not found"));
			if (conversation.getUser().getId() != userId)
				throw new RuntimeException("User is not authorized to update this conversation.");
		} catch (Exception e) {
			log.error(e.getMessage());
			throw new RuntimeException("Error checking conversation owner.\n" + e.getMessage());
		}
	}
}
