import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSmoothNavigate } from '@/layout/SmoothNavigationProvider';
import { SettingsSubHeader } from '@/features/settings/SettingsScreen';
import { Button } from '@/components/Button';
import { PocketIllustration } from '@/components/PocketIllustration';
import { TUTORIAL_STEPS } from './tutorialSteps';
import { useTutorialStore } from '@/store/tutorialStore';
import './TutorialScreen.css';

export function TutorialScreen() {
  const navigate = useSmoothNavigate();
  const [params] = useSearchParams();
  const stepParam = params.get('step');
  const initial = Math.min(Math.max(Number(stepParam || '1'), 1), TUTORIAL_STEPS.length);
  const [index, setIndex] = useState(initial - 1);
  const step = TUTORIAL_STEPS[index];

  useEffect(() => {
    const n = Math.min(Math.max(Number(stepParam || '1'), 1), TUTORIAL_STEPS.length);
    setIndex(n - 1);
  }, [stepParam]);

  useEffect(() => {
    void useTutorialStore.getState().setLastStep(step.id);
  }, [step.id]);

  const finish = async (status: 'skipped' | 'completed') => {
    await useTutorialStore.getState().setStatus(status);
    navigate('/settings', { replace: true });
  };

  const next = () => {
    if (index >= TUTORIAL_STEPS.length - 1) void finish('completed');
    else setIndex((i) => i + 1);
  };

  return (
    <div className="page page--no-nav tutorial">
      <SettingsSubHeader title="Help & tutorial" />
      <p className="tutorial-progress" aria-live="polite">
        Step {step.id} of {TUTORIAL_STEPS.length}
      </p>
      <div className="tutorial-progress-bar" aria-hidden="true">
        <span style={{ width: `${((index + 1) / TUTORIAL_STEPS.length) * 100}%` }} />
      </div>

      <div className="tutorial-panel card" key={step.id}>
        {step.id <= 2 && <PocketIllustration size={64} />}
        <h2>{step.title}</h2>
        <p className="text-secondary">{step.body}</p>
        {step.actionRoute && step.actionLabel && (
          <Button
            variant="soft"
            block
            style={{ marginTop: 16 }}
            onClick={() => navigate(step.actionRoute!)}
          >
            {step.actionLabel}
          </Button>
        )}
      </div>

      <div className="tutorial-actions stack">
        <div className="row">
          <Button variant="ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            Back
          </Button>
          <span className="spacer" />
          <Button variant="ghost" onClick={() => void finish('skipped')}>
            Skip tutorial
          </Button>
        </div>
        <Button block onClick={next}>
          {index >= TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
