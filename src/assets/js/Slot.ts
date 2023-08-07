interface SlotConfigurations {
  /** User configuration for maximum item inside a reel */
  maxReelItems?: number
  /** User configuration for whether winner should be removed from name list */
  removeWinner?: boolean
  /** User configuration for element selector which reel items should append to */
  reelContainerSelector: string
  /** User configuration for callback function that runs before spinning reel */
  onSpinStart?: () => void
  /** User configuration for callback function that runs after spinning reel */
  onSpinEnd?: () => void

  /** User configuration for callback function that runs after user updates the name list */
  onNameListChanged?: () => void
}

/** Class for doing random name pick and animation */
export default class Slot {
  /** List of names to draw from */
  private nameList: string[];

  /** List of winner prices */
  private prizeList: string[];

  private winnerList: string[];

  private randomNames: string[];

  /** Whether there is a previous winner element displayed in reel */
  private havePreviousWinner: boolean;

  /** Container that hold the reel items */
  private readonly reelContainer: HTMLElement | null;

  /** Maximum item inside a reel */
  private readonly maxReelItems: NonNullable<SlotConfigurations['maxReelItems']>;

  /** Whether winner should be removed from name list */
  private shouldRemoveWinner: NonNullable<SlotConfigurations['removeWinner']>;

  /** Reel animation object instance */
  private readonly reelAnimation?: Animation;

  /** Callback function that runs before spinning reel */
  private readonly onSpinStart?: NonNullable<SlotConfigurations['onSpinStart']>;

  /** Callback function that runs after spinning reel */
  private readonly onSpinEnd?: NonNullable<SlotConfigurations['onSpinEnd']>;

  /** Callback function that runs after spinning reel */
  private readonly onNameListChanged?: NonNullable<SlotConfigurations['onNameListChanged']>;

  /**
   * Constructor of Slot
   * @param maxReelItems  Maximum item inside a reel
   * @param removeWinner  Whether winner should be removed from name list
   * @param reelContainerSelector  The element ID of reel items to be appended
   * @param onSpinStart  Callback function that runs before spinning reel
   * @param onNameListChanged  Callback function that runs when user updates the name list
   */
  constructor(
    {
      maxReelItems = 30,
      removeWinner = true,
      reelContainerSelector,
      onSpinStart,
      onSpinEnd,
      onNameListChanged
    }: SlotConfigurations
  ) {
    this.nameList = [];
    this.prizeList = [];
    this.winnerList = [];
    this.randomNames = [];
    this.havePreviousWinner = false;
    this.reelContainer = document.querySelector(reelContainerSelector);
    this.maxReelItems = maxReelItems;
    this.shouldRemoveWinner = removeWinner;
    this.onSpinStart = onSpinStart;
    this.onSpinEnd = onSpinEnd;
    this.onNameListChanged = onNameListChanged;

    // Create reel animation
    this.reelAnimation = this.reelContainer?.animate(
      [
        { transform: 'none', filter: 'blur(0)' },
        { filter: 'blur(1px)', offset: 0.5 },
        // Here we transform the reel to move up and stop at the top of last item
        // "(Number of item - 1) * height of reel item" of wheel is the amount of pixel to move up
        // 7.5rem * 16 = 120px, which equals to reel item height
        { transform: `translateY(-${(this.maxReelItems - 1) * (7.5 * 16)}px)`, filter: 'blur(0)' }
      ],
      {
        duration: this.maxReelItems * 50, // 100ms for 1 item
        easing: 'linear', // TODO: it should be 'ease-in-out' . Have to find a way to make slowing down animation to randomly selected name element.
        iterations: 9999
      }
    );

    this.reelAnimation?.cancel();
  }

  /**
   * Setter for name list
   * @param names  List of names to draw a winner from
   */
  set names(names: string[]) {
    this.nameList = names;

    const reelItemsToRemove = this.reelContainer?.children
      ? Array.from(this.reelContainer.children)
      : [];

    reelItemsToRemove
      .forEach((element) => {
        element.remove();
      });

    this.havePreviousWinner = false;

    if (this.onNameListChanged) {
      this.onNameListChanged();
    }
  }

  /** Getter for name list */
  get names(): string[] {
    return this.nameList;
  }

  set prizes(prizes: string[]) {
    this.prizeList = prizes;
  }

  get prizes() {
    return this.prizeList;
  }

  get winners() {
    return this.winnerList;
  }

  /**
   * Setter for shouldRemoveWinner
   * @param removeWinner  Whether the winner should be removed from name list
   */
  set shouldRemoveWinnerFromNameList(removeWinner: boolean) {
    this.shouldRemoveWinner = removeWinner;
  }

  /** Getter for shouldRemoveWinner */
  get shouldRemoveWinnerFromNameList(): boolean {
    return this.shouldRemoveWinner;
  }

  /**
   * Returns a new array where the items are shuffled
   * @template T  Type of items inside the array to be shuffled
   * @param array  The array to be shuffled
   * @returns The shuffled array
   */
  private static shuffleNames<T = unknown>(array: T[]): T[] {
    const keys = Object.keys(array) as unknown[] as number[];
    const result: T[] = [];
    for (let k = 0, n = keys.length; k < array.length && n > 0; k += 1) {
      // eslint-disable-next-line no-bitwise
      const i = Math.random() * n | 0;
      const key = keys[i];
      result.push(array[key]);
      n -= 1;
      const tmp = keys[n];
      keys[n] = key;
      keys[i] = tmp;
    }
    return result;
  }

  /**
   * Function for spinning the slot
   * @returns Whether the spin is completed successfully
   */
  public async spin(): Promise<boolean> {
    if (!this.nameList.length) {
      console.error('Name List is empty. Cannot start spinning.');
      return false;
    }

    if (this.onSpinStart) {
      this.onSpinStart();
    }

    const { reelContainer, reelAnimation, shouldRemoveWinner } = this;
    if (!reelContainer || !reelAnimation) {
      return false;
    }

    // Shuffle names and create reel items
    this.randomNames = Slot.shuffleNames<string>(this.nameList);

    while (this.randomNames.length && this.randomNames.length < this.maxReelItems) {
      this.randomNames = [...this.randomNames, ...this.randomNames];
    }

    // eslint-disable-next-line max-len
    this.randomNames = this.randomNames.slice(0, this.maxReelItems - Number(this.havePreviousWinner));

    const fragment = document.createDocumentFragment();

    this.randomNames.forEach((name) => {
      const newReelItem = document.createElement('div');
      newReelItem.innerHTML = name;
      fragment.appendChild(newReelItem);
    });

    reelContainer.appendChild(fragment);

    console.log('Displayed items: ', this.randomNames);
    console.log('Winner: ', this.randomNames[this.randomNames.length - 1]);

    this.addWinner(this.randomNames[this.randomNames.length - 1], this.getActivePrizeToDraw());

    // Remove winner from name list if necessary
    if (shouldRemoveWinner) {
      const { randomNames } = this;
      this.nameList.splice(this.nameList.findIndex(
        (name) => name === randomNames[randomNames.length - 1]
      ), 1);
    }

    // remove prize from list
    this.prizes.splice(0, 1);

    console.log('Remaining: ', this.nameList);

    // Play the spin animation
    const animationPromise = new Promise((resolve) => {
      reelAnimation.onfinish = resolve;
    });

    reelAnimation.play();

    await animationPromise;

    // Sets the current playback time to the end of the animation
    // Fix issue for animatin not playing after the initial play on Safari
    reelAnimation.finish();

    Array.from(reelContainer.children)
      .slice(0, reelContainer.children.length - 1)
      .forEach((element) => {
        element.remove();
      });

    this.havePreviousWinner = true;

    if (this.onSpinEnd) {
      this.onSpinEnd();
    }
    return true;
  }

  private addWinner(name, prize) {
    this.winnerList.push(`${prize} - ${name}`);
  }

  public getActivePrizeToDraw() {
    return this.prizeList.length <= 0 ? '-------' : this.prizeList[0];
  }

  public forceStopSpin() :boolean {
    const { reelContainer, reelAnimation } = this;

    reelAnimation?.finish();

    Array.from(reelContainer!.children)
      .slice(0, reelContainer!.children.length - 1)
      .forEach((element) => {
        element.remove();
      });

    this.havePreviousWinner = true;

    if (this.onSpinEnd) {
      this.onSpinEnd();
    }
    return true;
  }
}
