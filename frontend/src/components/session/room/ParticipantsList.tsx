import React, { memo } from "react";
import {
  Box,
  Typography,
  Avatar,
  AvatarGroup,
  Chip,
  Divider,
  Paper,
} from "@mui/material";
import {
  Person as PersonIcon,
  LocalHospital as DoctorIcon,
  Face as PatientIcon,
  Visibility as ObserverIcon,
} from "@mui/icons-material";

/**
 * Participant interface
 */
export interface Participant {
  id: string;
  name: string;
  role: "doctor" | "patient" | "observer";
  isOnline?: boolean;
  hasCompleted?: boolean;
  hasGivenFeedback?: boolean;
}

/**
 * ParticipantsList component props
 */
interface ParticipantsListProps {
  participants: Participant[];
  showCompact?: boolean;
  currentUserId?: string;
}

/**
 * Get role icon based on participant role
 */
const getRoleIcon = (role: string) => {
  switch (role.toLowerCase()) {
    case "doctor":
      return <DoctorIcon fontSize="small" />;
    case "patient":
      return <PatientIcon fontSize="small" />;
    case "observer":
      return <ObserverIcon fontSize="small" />;
    default:
      return <PersonIcon fontSize="small" />;
  }
};

/**
 * Get role color based on participant role
 */
const getRoleColor = (role: string): "primary" | "secondary" | "default" | "error" | "info" | "success" | "warning" => {
  switch (role.toLowerCase()) {
    case "doctor":
      return "primary";
    case "patient":
      return "secondary";
    case "observer":
      return "info";
    default:
      return "default";
  }
};

/**
 * Get initials from name
 */
const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Compact view showing avatars only
 */
const CompactView = memo(({ participants }: { participants: Participant[] }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    <AvatarGroup max={5} spacing="small">
      {participants.map((participant) => (
        <Avatar
          key={participant.id}
          sx={{
            bgcolor: getRoleColor(participant.role) === "primary" ? "primary.main" :
                     getRoleColor(participant.role) === "secondary" ? "secondary.main" :
                     getRoleColor(participant.role) === "info" ? "info.main" : "grey.500",
            width: 32,
            height: 32,
            fontSize: "0.75rem",
            border: participant.isOnline ? "2px solid #4caf50" : "2px solid #ccc",
          }}
        >
          {getInitials(participant.name)}
        </Avatar>
      ))}
    </AvatarGroup>
    <Typography variant="body2" color="text.secondary">
      {participants.length} participant{participants.length !== 1 ? "s" : ""}
    </Typography>
  </Box>
));

CompactView.displayName = "CompactView";

/**
 * Full list view with detailed participant info
 */
const FullListView = memo(({ participants, currentUserId }: { participants: Participant[]; currentUserId?: string }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 2,
      overflow: "hidden",
    }}
  >
    {participants.map((participant, index) => (
      <Box key={participant.id}>
        {index > 0 && <Divider />}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            p: 1.5,
            gap: 2,
            bgcolor: participant.id === currentUserId ? "action.selected" : "transparent",
            "&:hover": {
              bgcolor: "action.hover",
            },
          }}
        >
          <Avatar
            sx={{
              bgcolor: getRoleColor(participant.role) === "primary" ? "primary.main" :
                       getRoleColor(participant.role) === "secondary" ? "secondary.main" :
                       getRoleColor(participant.role) === "info" ? "info.main" : "grey.500",
              width: 40,
              height: 40,
            }}
          >
            {getInitials(participant.name)}
          </Avatar>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
              {participant.name}
              {participant.id === currentUserId && (
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ ml: 1, color: "text.secondary" }}
                >
                  (You)
                </Typography>
              )}
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
              <Chip
                size="small"
                icon={getRoleIcon(participant.role)}
                label={participant.role.charAt(0).toUpperCase() + participant.role.slice(1)}
                color={getRoleColor(participant.role)}
                variant="outlined"
                sx={{ height: 24 }}
              />
              {participant.isOnline && (
                <Chip
                  size="small"
                  label="Online"
                  color="success"
                  variant="filled"
                  sx={{ height: 24 }}
                />
              )}
              {participant.hasCompleted && (
                <Chip
                  size="small"
                  label="Completed"
                  color="default"
                  variant="outlined"
                  sx={{ height: 24 }}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    ))}
  </Paper>
));

FullListView.displayName = "FullListView";

/**
 * ParticipantsList component - displays session participants
 * Can show in compact (avatars only) or full list mode
 */
const ParticipantsList = memo(({ participants, showCompact = false, currentUserId }: ParticipantsListProps) => {
  if (!participants || participants.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No participants yet
      </Typography>
    );
  }

  // Sort participants: Doctor first, then Patient, then Observers
  const sortedParticipants = [...participants].sort((a, b) => {
    const roleOrder: Record<string, number> = { doctor: 0, patient: 1, observer: 2 };
    return (roleOrder[a.role.toLowerCase()] || 3) - (roleOrder[b.role.toLowerCase()] || 3);
  });

  if (showCompact) {
    return <CompactView participants={sortedParticipants} />;
  }

  return <FullListView participants={sortedParticipants} currentUserId={currentUserId} />;
});

ParticipantsList.displayName = "ParticipantsList";

export default ParticipantsList;


