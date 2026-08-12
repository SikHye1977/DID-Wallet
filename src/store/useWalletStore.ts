// src/store/useWalletStore.ts
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DidData} from '../types/did'; // 👈 기존 DidData 임포트

interface WalletState {
  didList: DidData[];
  selectedDid: DidData | null;
  vcList: any[];

  setDidList: (list: DidData[]) => void;
  setSelectedDid: (did: DidData) => void;
  setVcList: (list: any[]) => void;
  addVc: (vc: any) => void;
  removeVc: (ticketNumber: string) => void;
}

const INITIAL_DID_LIST: DidData[] = [
  {
    alias: 'DID #1',
    did: '83rynWhwXzLsbHHqm47yP6',
    edVerkey: '83rynWhwXzLsbHHqm47yP6...AMbtNxdR5DxTcyrqYo',
    edSecretkey: 'secret_key_1',
    xVerkey: 'GEubnw7pEvSCFUpx...6kTr9q7DTBd3yxjEfj',
    xSecretkey: 'x_secret_1',
    createdAt: Date.now(),
    isRegistered: true,
  },
  {
    alias: 'DID #2',
    did: 'Cku4BkJQqTU6jPTZwbE7nW',
    edVerkey: 'Cku4BkJQqTU6jPTZwbE7nW...AMbtNxdR5DxTcyrqYo',
    edSecretkey: 'secret_key_2',
    xVerkey: 'GEubnw7pEvSCFUpx...6kTr9q7DTBd3yxjEfj',
    xSecretkey: 'x_secret_2',
    createdAt: Date.now(),
    isRegistered: false,
  },
];

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      didList: INITIAL_DID_LIST,
      selectedDid: INITIAL_DID_LIST[0],
      vcList: [],

      setDidList: didList => set({didList}),
      setSelectedDid: selectedDid => set({selectedDid}),
      setVcList: vcList => set({vcList}),

      addVc: newVc => {
        const {vcList} = get();
        const exists = vcList.some(
          item =>
            item?.credentialSubject?.ticketNumber ===
            newVc?.credentialSubject?.ticketNumber,
        );
        if (!exists) set({vcList: [newVc, ...vcList]});
      },

      removeVc: ticketNumber => {
        const {vcList} = get();
        set({
          vcList: vcList.filter(
            item => item?.credentialSubject?.ticketNumber !== ticketNumber,
          ),
        });
      },
    }),
    {
      name: 'wallet-zustand-storage-v2',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
