package com.plabpractice.api.controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.Map;

@Controller
public class WebSocketController {

    @MessageMapping("/session/{sessionId}/message")
    @SendTo("/topic/session/{sessionId}")
    public Map<String, Object> handleSessionMessage(@DestinationVariable String sessionId,
            Map<String, Object> message) {
        // Add timestamp to message
        message.put("timestamp", LocalDateTime.now());
        return message;
    }

    @MessageMapping("/session/{sessionId}/join")
    @SendTo("/topic/session/{sessionId}")
    public Map<String, Object> handleUserJoin(@DestinationVariable String sessionId, Map<String, Object> joinMessage) {
        joinMessage.put("type", "USER_JOINED");
        joinMessage.put("timestamp", LocalDateTime.now());
        return joinMessage;
    }

    @MessageMapping("/session/{sessionId}/leave")
    @SendTo("/topic/session/{sessionId}")
    public Map<String, Object> handleUserLeave(@DestinationVariable String sessionId,
            Map<String, Object> leaveMessage) {
        leaveMessage.put("type", "USER_LEFT");
        leaveMessage.put("timestamp", LocalDateTime.now());
        return leaveMessage;
    }

    @MessageMapping("/session/{sessionId}/status")
    @SendTo("/topic/session/{sessionId}")
    public Map<String, Object> handleStatusChange(@DestinationVariable String sessionId,
            Map<String, Object> statusMessage) {
        statusMessage.put("type", "STATUS_CHANGE");
        statusMessage.put("timestamp", LocalDateTime.now());
        return statusMessage;
    }
}