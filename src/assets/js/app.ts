import confetti from 'canvas-confetti';
import Slot from '@js/Slot';
import SoundEffects from '@js/SoundEffects';

// Initialize slot machine
(() => {
  const activePrize = document.getElementById('active-prize') as HTMLButtonElement | null;
  const drawButton = document.getElementById('draw-button') as HTMLButtonElement | null;
  const stopButton = document.getElementById('stop-button') as HTMLButtonElement | null;
  const fullscreenButton = document.getElementById('fullscreen-button') as HTMLButtonElement | null;
  const winnersButton = document.getElementById('winners-button') as HTMLButtonElement | null;
  const settingsButton = document.getElementById('settings-button') as HTMLButtonElement | null;
  const settingsWrapper = document.getElementById('settings') as HTMLDivElement | null;
  const settingsContent = document.getElementById('settings-panel') as HTMLDivElement | null;
  const settingsSaveButton = document.getElementById('settings-save') as HTMLButtonElement | null;
  const settingsCloseButton = document.getElementById('settings-close') as HTMLButtonElement | null;
  const winnerWrapper = document.getElementById('winner') as HTMLDivElement | null;
  const winnersListPanel = document.getElementById('winners-list') as HTMLOListElement | null;
  const winnerCloseButton = document.getElementById('winners-close') as HTMLButtonElement | null;
  const sunburstSvg = document.getElementById('sunburst') as HTMLImageElement | null;
  const confettiCanvas = document.getElementById('confetti-canvas') as HTMLCanvasElement | null;
  const nameListTextArea = document.getElementById('name-list') as HTMLTextAreaElement | null;
  const prizeListTextArea = document.getElementById('prize-list') as HTMLTextAreaElement | null;
  const removeNameFromListCheckbox = document.getElementById('remove-from-list') as HTMLInputElement | null;
  const enableSoundCheckbox = document.getElementById('enable-sound') as HTMLInputElement | null;

  // Graceful exit if necessary elements are not found
  if (!(
    activePrize
    && drawButton
      && stopButton
    && fullscreenButton
    && settingsButton
      && winnersButton
      && winnersListPanel
      && winnerWrapper
      && winnerCloseButton
    && settingsWrapper
    && settingsContent
    && settingsSaveButton
    && settingsCloseButton
    && sunburstSvg
    && confettiCanvas
    && nameListTextArea
      && prizeListTextArea
    && removeNameFromListCheckbox
    && enableSoundCheckbox
  )) {
    console.error('One or more Element ID is invalid. This is possibly a bug.');
    return;
  }

  if (!(confettiCanvas instanceof HTMLCanvasElement)) {
    console.error('Confetti canvas is not an instance of Canvas. This is possibly a bug.');
    return;
  }

  const soundEffects = new SoundEffects();
  const MAX_REEL_ITEMS = 1000;
  const CONFETTI_COLORS = ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'];
  let confettiAnimationId;

  /** Confeetti animation instance */
  const customConfetti = confetti.create(confettiCanvas, {
    resize: true,
    useWorker: true
  });

  /** Triggers cconfeetti animation until animation is canceled */
  const confettiAnimation = () => {
    const windowWidth = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;
    const confettiScale = Math.max(0.5, Math.min(1, windowWidth / 1100));

    customConfetti({
      particleCount: 1,
      gravity: 0.8,
      spread: 90,
      origin: { y: 0.6 },
      colors: [CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]],
      scalar: confettiScale
    });

    confettiAnimationId = window.requestAnimationFrame(confettiAnimation);
  };

  /** Function to stop the winning animation */
  const stopWinningAnimation = () => {
    if (confettiAnimationId) {
      window.cancelAnimationFrame(confettiAnimationId);
    }
    sunburstSvg.style.display = 'none';
  };

  /**  Function to be trigger before spinning */
  const onSpinStart = () => {
    stopWinningAnimation();
    // eslint-disable-next-line no-use-before-define
    showActivePrizeToDraw();
    drawButton.disabled = true;
    stopButton.disabled = false;
    settingsButton.disabled = true;
    soundEffects.spinIndefinitely();
  };

  /**  Functions to be trigger after spinning */
  const onSpinEnd = async () => {
    confettiAnimation();
    sunburstSvg.style.display = 'block';
    await soundEffects.forceStop();
    await soundEffects.win();
    drawButton.disabled = false;
    stopButton.disabled = true;
    settingsButton.disabled = false;
  };

  /** Slot instance */
  const slot = new Slot({
    reelContainerSelector: '#reel',
    maxReelItems: MAX_REEL_ITEMS,
    onSpinStart,
    onSpinEnd,
    onNameListChanged: stopWinningAnimation
  });

  const showActivePrizeToDraw = () => {
    activePrize.innerText = slot.getActivePrizeToDraw();
  };

  /** To open the setting page */
  const onSettingsOpen = () => {
    nameListTextArea.value = slot.names.length ? slot.names.join('\n') : '';
    removeNameFromListCheckbox.checked = slot.shouldRemoveWinnerFromNameList;
    enableSoundCheckbox.checked = !soundEffects.mute;
    settingsWrapper.style.display = 'block';
  };

  const onWinnersOpen = () => {
    winnerWrapper.style.display = 'block';
  };

  /** To close the setting page */
  const onSettingsClose = () => {
    settingsContent.scrollTop = 0;
    settingsWrapper.style.display = 'none';
  };

  // Click handler for "Draw" button
  drawButton.addEventListener('click', () => {
    if (!slot.names.length) {
      onSettingsOpen();
      // eslint-disable-next-line no-alert
      alert('Please insert name list');
      return;
    }

    if (!slot.prizes.length) {
      onSettingsOpen();
      // eslint-disable-next-line no-alert
      alert('Please insert prize item list');
      return;
    }

    showActivePrizeToDraw();

    slot.spin();
  });

  stopButton?.addEventListener('click', () => {
    slot.forceStopSpin();
    winnersListPanel.innerHTML = '';
    slot.winners.forEach((winner) => {
      const winnerItem = document.createElement('li');
      winnerItem.innerText = winner;
      winnersListPanel.appendChild(winnerItem);
    });
  });

  // Hide fullscreen button when it is not supported

  // @ts-expect-error - for older browsers support
  if (!(document.documentElement.requestFullscreen && document.exitFullscreen)) {
    fullscreenButton.remove();
  }

  // Click handler for "Fullscreen" button
  fullscreenButton.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      return;
    }

    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  });

  // Click handler for "Settings" button
  settingsButton.addEventListener('click', onSettingsOpen);

  // Click handler for "Winners" button
  winnersButton.addEventListener('click', onWinnersOpen);

  // Click handler for "Save" button for setting page
  settingsSaveButton.addEventListener('click', () => {
    slot.names = nameListTextArea.value
      ? nameListTextArea.value.split(/\n/).filter((name) => Boolean(name.trim()))
      : [];
    slot.prizes = prizeListTextArea.value ? prizeListTextArea.value.split(/\n/).filter((prize) => Boolean(prize.trim())) : [];
    slot.shouldRemoveWinnerFromNameList = removeNameFromListCheckbox.checked;
    soundEffects.mute = !enableSoundCheckbox.checked;
    onSettingsClose();
    showActivePrizeToDraw();
  });

  // Click handler for "Discard and close" button for setting page
  settingsCloseButton.addEventListener('click', onSettingsClose);
  winnerCloseButton.addEventListener('click', () => {
    winnerWrapper.style.display = 'none';
  });
  showActivePrizeToDraw();
})();
