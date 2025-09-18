"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type {
  FlashcardCreateDto,
  FlashcardUpdateDto,
  FlashcardViewModel,
} from "@/lib/types";

const flashcardSchema = z.object({
  front: z
    .string()
    .min(1, "Front field is required")
    .max(200, "Front can have a maximum of 200 characters"),
  back: z
    .string()
    .min(1, "Back field is required")
    .max(500, "Back can have a maximum of 500 characters"),
});

type FlashcardFormData = z.infer<typeof flashcardSchema>;

interface FlashcardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: FlashcardCreateDto | FlashcardUpdateDto,
    id?: number,
  ) => Promise<void>;
  initialData: FlashcardViewModel | null;
}

export function FlashcardFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: FlashcardFormModalProps) {
  const isEditing = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FlashcardFormData>({
    resolver: zodResolver(flashcardSchema),
    defaultValues: {
      front: initialData?.front || "",
      back: initialData?.back || "",
    },
  });

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        front: initialData?.front || "",
        back: initialData?.back || "",
      });
      setIsSubmitting(false);
    }
  }, [isOpen, initialData, form]);

  const handleFormSubmit = async (data: FlashcardFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && initialData?.id) {
        // Update existing flashcard
        const updateData: FlashcardUpdateDto = {
          front: data.front,
          back: data.back,
          source: "manual", // When manually edited, source becomes manual
        };
        await onSubmit(updateData, initialData.id);
      } else {
        // Create new flashcard
        const createData: FlashcardCreateDto = {
          front: data.front,
          back: data.back,
          source: "manual",
          generation_id: null,
        };
        await onSubmit(createData);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Don't allow closing during submission
    if (isSubmitting) return;
    form.reset();
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    // Don't allow closing during submission
    if (!open && isSubmitting) return;
    if (!open) handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit flashcard" : "Add new flashcard"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Make changes to your flashcard."
              : "Fill in the fields to create a new flashcard."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="front"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flashcard front</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter text for the front of the card..."
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground">
                    {field.value.length}/200 characters
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="back"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flashcard back</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter text for the back of the card..."
                      className="min-h-[100px]"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground">
                    {field.value.length}/500 characters
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="cursor-pointer transition-all duration-200 hover:bg-muted hover:scale-105 disabled:pointer-events-none disabled:opacity-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  "Save changes"
                ) : (
                  "Add flashcard"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
