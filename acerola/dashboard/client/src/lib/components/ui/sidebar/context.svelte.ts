import { getContext, setContext } from 'svelte';

const SIDEBAR_CONTEXT_KEY = Symbol('sidebar-context');

const SIDEBAR_COOKIE_NAME = 'sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export class SidebarState {
  #open = $state(true);
  #openMobile = $state(false);
  #isMobile = $state(false);

  constructor(defaultOpen = true, isMobile = false) {
    this.#open = defaultOpen;
    this.#isMobile = isMobile;
  }

  get open() {
    return this.#open;
  }
  set open(value: boolean) {
    this.#open = value;
    if (typeof document !== 'undefined') {
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    }
  }

  get openMobile() {
    return this.#openMobile;
  }
  set openMobile(value: boolean) {
    this.#openMobile = value;
  }

  get isMobile() {
    return this.#isMobile;
  }
  set isMobile(value: boolean) {
    this.#isMobile = value;
  }

  get state(): 'expanded' | 'collapsed' {
    return this.#open ? 'expanded' : 'collapsed';
  }

  setOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof value === 'function' ? value(this.#open) : value;
    this.open = next;
  };

  setOpenMobile = (value: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof value === 'function' ? value(this.#openMobile) : value;
    this.openMobile = next;
  };

  toggleSidebar = () => {
    if (this.#isMobile) {
      this.openMobile = !this.#openMobile;
    } else {
      this.open = !this.#open;
    }
  };
}

export function setSidebar(state: SidebarState) {
  setContext(SIDEBAR_CONTEXT_KEY, state);
  return state;
}

export function useSidebar(): SidebarState {
  const context = getContext<SidebarState>(SIDEBAR_CONTEXT_KEY);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }
  return context;
}
