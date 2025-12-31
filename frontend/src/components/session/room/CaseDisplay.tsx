import React, { memo, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Divider,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  Article as ArticleIcon,
} from "@mui/icons-material";

/**
 * Section interface for case content
 */
interface CaseSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

/**
 * Visual data for cases (can be image or text)
 */
interface VisualData {
  type: "image" | "text";
  content: string;
}

/**
 * Category interface
 */
interface Category {
  id: number;
  name: string;
}

/**
 * Case data interface
 */
export interface CaseData {
  id: number;
  title: string;
  description?: string;
  doctorSections?: CaseSection[];
  patientSections?: CaseSection[];
  doctorNotes?: string;
  patientNotes?: string;
  imageUrl?: string;
  visualData?: VisualData;
  category: Category;
  duration?: number;
}

/**
 * CaseDisplay component props
 */
interface CaseDisplayProps {
  caseData: CaseData;
  userRole: "doctor" | "patient" | "observer";
  phase: "waiting" | "reading" | "consultation" | "feedback" | "completed";
  showFullContent?: boolean;
}

/**
 * Section display component
 */
const SectionDisplay = memo(({ sections, title }: { sections: CaseSection[]; title: string }) => {
  const [expanded, setExpanded] = useState(true);

  if (!sections || sections.length === 0) return null;

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          mb: 1,
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
          {title}
        </Typography>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        {sortedSections.map((section) => (
          <Paper
            key={section.id}
            variant="outlined"
            sx={{
              p: 2,
              mb: 1,
              borderRadius: 2,
              "&:last-child": { mb: 0 },
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 500, mb: 1, color: "primary.main" }}>
              {section.title}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "pre-wrap",
                color: "text.secondary",
                lineHeight: 1.6,
              }}
            >
              {section.content}
            </Typography>
          </Paper>
        ))}
      </Collapse>
    </Box>
  );
});

SectionDisplay.displayName = "SectionDisplay";

/**
 * Notes display component
 */
const NotesDisplay = memo(({ notes, title }: { notes: string; title: string }) => {
  if (!notes) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        {title}
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: "grey.50",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
          }}
        >
          {notes}
        </Typography>
      </Paper>
    </Box>
  );
});

NotesDisplay.displayName = "NotesDisplay";

/**
 * Visual content display (image or text)
 */
const VisualContent = memo(({ visualData, imageUrl }: { visualData?: VisualData; imageUrl?: string }) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Determine what to display
  const hasImage = visualData?.type === "image" ? !!visualData.content : !!imageUrl;
  const hasText = visualData?.type === "text" && !!visualData.content;
  const imageSrc = visualData?.type === "image" ? visualData.content : imageUrl;

  if (!hasImage && !hasText) return null;

  if (hasText) {
    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <ArticleIcon fontSize="small" color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Visual Information
          </Typography>
        </Box>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: "info.light",
            borderColor: "info.main",
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {visualData?.content}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <ImageIcon fontSize="small" color="primary" />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Case Image
        </Typography>
      </Box>
      <Box
        sx={{
          cursor: "pointer",
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          "&:hover": {
            boxShadow: 2,
          },
        }}
        onClick={() => setDialogOpen(true)}
      >
        <img
          src={imageSrc}
          alt="Case visual"
          style={{
            width: "100%",
            maxHeight: 300,
            objectFit: "contain",
            display: "block",
          }}
        />
      </Box>

      {/* Full-size image dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">Case Image</Typography>
          <IconButton onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <img
            src={imageSrc}
            alt="Case visual - full size"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
});

VisualContent.displayName = "VisualContent";

/**
 * CaseDisplay component - displays case information based on user role
 * Doctor sees doctor-specific content, Patient/Observer see patient content
 */
const CaseDisplay = memo(({ caseData, userRole, phase, showFullContent = true }: CaseDisplayProps) => {
  if (!caseData) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            No case selected yet
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Determine which content to show based on role
  const isDoctor = userRole === "doctor";
  const sections = isDoctor ? caseData.doctorSections : caseData.patientSections;
  const notes = isDoctor ? caseData.doctorNotes : caseData.patientNotes;
  const sectionTitle = isDoctor ? "Doctor Instructions" : "Patient Information";
  const notesTitle = isDoctor ? "Additional Notes for Doctor" : "Background Information";

  // During waiting phase, show minimal info
  if (phase === "waiting") {
    return (
      <Card sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Case information will be revealed when the session starts
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid #e5e7eb",
        backgroundColor: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(6px)",
        boxShadow: "0 10px 20px rgba(2, 6, 23, 0.04)",
      }}
    >
      <CardContent>
        {/* Case header */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
              {caseData.title}
            </Typography>
            <Chip
              label={caseData.category.name}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
          {caseData.description && (
            <Typography variant="body2" color="text.secondary">
              {caseData.description}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {showFullContent && (
          <>
            {/* Visual content (image or text) */}
            <VisualContent visualData={caseData.visualData} imageUrl={caseData.imageUrl} />

            {/* Role-specific sections */}
            {sections && sections.length > 0 && (
              <SectionDisplay sections={sections} title={sectionTitle} />
            )}

            {/* Role-specific notes */}
            {notes && <NotesDisplay notes={notes} title={notesTitle} />}
          </>
        )}
      </CardContent>
    </Card>
  );
});

CaseDisplay.displayName = "CaseDisplay";

export default CaseDisplay;

