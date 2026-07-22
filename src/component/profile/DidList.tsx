import React from 'react';
import {View, Text, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {DidData} from '../../types/did';

interface DidListProps {
  didList: DidData[];
  selectedDid: DidData | null;
  onSelectDid: (item: DidData) => void;
}

export default function DidList({
  didList,
  selectedDid,
  onSelectDid,
}: DidListProps) {
  const renderItem = ({item}: {item: DidData}) => (
    <TouchableOpacity
      style={[
        styles.didItem,
        selectedDid?.did === item.did && styles.selectedDidItem,
      ]}
      onPress={() => onSelectDid(item)}>
      <Text style={styles.didAlias}>{item.alias}</Text>
      <Text style={styles.didDetailText} numberOfLines={1}>
        {item.did}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.listContainer}>
      <Text style={styles.sectionTitle}>보유 DID 목록 ({didList.length})</Text>
      <FlatList
        data={didList}
        renderItem={renderItem}
        keyExtractor={item => item.did}
        style={styles.flatList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>생성된 DID가 없습니다.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {flex: 1, marginBottom: 20},
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#555',
  },
  flatList: {flexGrow: 0, maxHeight: 200},
  didItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedDidItem: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    borderWidth: 2,
  },
  didAlias: {fontSize: 16, fontWeight: 'bold', color: '#333'},
  didDetailText: {fontSize: 12, color: '#666', marginTop: 4},
  emptyText: {color: '#999', textAlign: 'center', padding: 20},
});
