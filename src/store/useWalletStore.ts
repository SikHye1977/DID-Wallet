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
  // ⭕️ null 인수를 받을 수 있도록 타입 지정
  setSelectedDid: (did: DidData | null) => void;
  setVcList: (list: any[]) => void;
  addVc: (vc: any) => void;
  removeVc: (ticketNumber: string) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      didList: [],
      selectedDid: null,
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
