import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';

import type { WorkoutDraft } from '../draft';
import { useSaveAsTemplate } from '../hooks';

/** "Save as template" button plus its naming dialog. */
export function SaveTemplateButton({ workout }: { workout: WorkoutDraft }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(workout.name);
  const [saved, setSaved] = useState(false);
  const saveAsTemplate = useSaveAsTemplate();
  const trimmed = name.trim();

  return (
    <>
      <Button
        variant="outline"
        onPress={() => setOpen(true)}
        disabled={saved || workout.exercises.length === 0}
      >
        <Text>{saved ? 'Saved as template' : 'Save as template'}</Text>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-80 max-w-full">
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
            <DialogDescription>
              Keeps these exercises with their set counts and reps, to start from next time.
            </DialogDescription>
          </DialogHeader>
          <View className="gap-1.5">
            <Input
              value={name}
              onChangeText={setName}
              maxLength={80}
              aria-label="Template name"
              autoFocus
            />
            {trimmed ? null : <Text className="text-sm text-destructive">Enter a name</Text>}
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setOpen(false)}>
              <Text>Cancel</Text>
            </Button>
            <Button
              disabled={!trimmed}
              onPress={() => {
                saveAsTemplate.save(workout, trimmed);
                setSaved(true);
                setOpen(false);
              }}
            >
              <Text>Save</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
