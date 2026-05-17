import { ArrowRightLeft, CheckCircle, PiggyBank, RotateCcw, Undo2, UserMinus, UserPlus, XCircle } from 'lucide-react';

export const normalizeClientStatus = (value) =>
  String(typeof value === 'object' ? value?.code || value?.value || value?.name || '' : value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');

const hasStatusFlag = (status, key) => Boolean(status && typeof status === 'object' && status[key] === true);

export const resolveClientActionState = (client) => {
  const statusObj = client?.status && typeof client.status === 'object' ? client.status : null;
  const state = normalizeClientStatus(client?.status);

  const isTransferState =
    hasStatusFlag(statusObj, 'transferInProgress') ||
    state.includes('TRANSFER');

  const isPendingState =
    hasStatusFlag(statusObj, 'pendingApproval') ||
    hasStatusFlag(statusObj, 'submittedAndPendingApproval') ||
    state.includes('PENDING') ||
    state.includes('SUBMITTED');

  const isActiveState =
    hasStatusFlag(statusObj, 'active') ||
    state === 'ACTIVE' ||
    state.endsWith('_ACTIVE');

  const isClosedState =
    hasStatusFlag(statusObj, 'closed') ||
    state.includes('CLOSED');

  const isRejectedState =
    hasStatusFlag(statusObj, 'rejected') ||
    state.includes('REJECT');

  const isWithdrawnState =
    hasStatusFlag(statusObj, 'withdrawn') ||
    hasStatusFlag(statusObj, 'withdrawnByApplicant') ||
    state.includes('WITHDRAW');

  return {
    isTransferState,
    isPendingState,
    isActiveState,
    isClosedState,
    isRejectedState,
    isWithdrawnState,
  };
};

export const getVisibleClientActions = (client, { hasAssignedStaff = false, savingsAccounts = [] } = {}) => {
  if (!client?.id) return [];

  const {
    isTransferState,
    isPendingState,
    isActiveState,
    isClosedState,
    isRejectedState,
    isWithdrawnState,
  } = resolveClientActionState(client);

  if (isTransferState) {
    return [
      { command: 'acceptTransfer', title: 'Accept transfer', icon: CheckCircle, tone: 'emerald' },
      { command: 'rejectTransfer', title: 'Reject transfer', icon: XCircle, tone: 'rose' },
      { command: 'withdrawTransfer', title: 'Withdraw transfer', icon: Undo2, tone: 'amber' },
    ];
  }

  if (isPendingState) {
    return [
      { command: 'activate', title: 'Activate client', icon: CheckCircle, tone: 'emerald' },
      { command: 'reject', title: 'Reject client', icon: XCircle, tone: 'rose' },
      { command: 'withdraw', title: 'Withdraw client', icon: Undo2, tone: 'amber' },
    ];
  }

  if (isActiveState) {
    const actions = [
      { command: 'close', title: 'Close client', icon: XCircle, tone: 'rose' },
      hasAssignedStaff
        ? { command: 'unassignStaff', title: 'Unassign staff', icon: UserMinus, tone: 'amber' }
        : { command: 'assignStaff', title: 'Assign staff', icon: UserPlus, tone: 'slate' },
      { command: 'proposeTransfer', title: 'Propose transfer', icon: ArrowRightLeft, tone: 'slate' },
      { command: 'proposeAndAcceptTransfer', title: 'Transfer now', icon: ArrowRightLeft, tone: 'cyan' },
    ];

    if (Array.isArray(savingsAccounts) && savingsAccounts.length > 0) {
      actions.splice(2, 0, { command: 'updateSavingsAccount', title: 'Update default savings', icon: PiggyBank, tone: 'cyan' });
    }

    return actions;
  }

  if (isClosedState) {
    return [{ command: 'reactivate', title: 'Reactivate client', icon: RotateCcw, tone: 'emerald' }];
  }

  if (isRejectedState) {
    return [{ command: 'undoReject', title: 'Undo reject', icon: RotateCcw, tone: 'amber' }];
  }

  if (isWithdrawnState) {
    return [{ command: 'undoWithdraw', title: 'Undo withdraw', icon: RotateCcw, tone: 'amber' }];
  }

  return [];
};
