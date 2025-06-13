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
    .min(1, "Pole przód jest wymagane")
    .max(200, "Przód może mieć maksymalnie 200 znaków"),
  back: z
    .string()
    .min(1, "Pole tył jest wymagane")
    .max(500, "Tył może mieć maksymalnie 500 znaków"),
});

type FlashcardFormData = z.infer<typeof flashcardSchema>;

interface FlashcardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: FlashcardCreateDto | FlashcardUpdateDto,
    id?: number
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
            {isEditing ? "Edytuj fiszkę" : "Dodaj nową fiszkę"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Wprowadź zmiany w swojej fiszce."
              : "Wypełnij pola, aby utworzyć nową fiszkę."}
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
                  <FormLabel>Przód fiszki</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Wprowadź tekst na przód fiszki..."
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground">
                    {field.value.length}/200 znaków
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
                  <FormLabel>Tył fiszki</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Wprowadź tekst na tył fiszki..."
                      className="min-h-[100px]"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground">
                    {field.value.length}/500 znaków
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
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Zapisywanie...
                  </>
                ) : isEditing ? (
                  "Zapisz zmiany"
                ) : (
                  "Dodaj fiszkę"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
