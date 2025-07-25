import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica'
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    color: '#2E7D32'
  },
  mapContainer: {
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    padding: 10
  },
  mapImage: {
    width: '100%',
    height: 300
  },
  section: {
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
    color: '#2E7D32',
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
    paddingBottom: 5
  },
  row: {
    flexDirection: 'row',
    marginVertical: 5
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 150
  },
  value: {
    fontSize: 12,
    flex: 1
  },
  table: {
    width: '100%',
    marginVertical: 10
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD'
  },
  tableHeader: {
    backgroundColor: '#2E7D32',
    color: 'white',
    fontWeight: 'bold'
  },
  tableCell: {
    padding: 5,
    fontSize: 10,
    flex: 1,
    textAlign: 'left'
  },
  statusBadge: {
    padding: 2,
    borderRadius: 3,
    fontSize: 10,
    textAlign: 'center',
    width: 60
  }
});

const statusColors = {
  excellent: '#4CAF50',
  good: '#4CAF50',
  fair: '#FFC107',
  poor: '#F44336',
  high: '#2196F3',
  moderate: '#FFC107',
  low: '#F44336',
  dry: '#F44336',
  none: '#9E9E9E',
  unknown: '#9E9E9E'
};

const LandAnalysisReport = ({ data, mapImage }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Land Analysis Report</Text>
      
      {mapImage && (
        <View style={styles.mapContainer}>
          <Text style={styles.sectionTitle}>Location Map</Text>
          <Image style={styles.mapImage} src={mapImage} />
        </View>
      )}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Latitude:</Text>
          <Text style={styles.value}>{data.location.latitude}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Longitude:</Text>
          <Text style={styles.value}>{data.location.longitude}</Text>
        </View>
        {data.location.area && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Area (Hectares):</Text>
              <Text style={styles.value}>{data.location.area.hectares}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Area (Acres):</Text>
              <Text style={styles.value}>{data.location.area.acres}</Text>
            </View>
          </>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Analysis Date:</Text>
          <Text style={styles.value}>{data.date}</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Land Health Summary</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Parameter</Text>
            <Text style={styles.tableCell}>Status</Text>
            <Text style={styles.tableCell}>Details</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Vegetation</Text>
            <View style={styles.tableCell}>
              <Text style={[styles.statusBadge, { backgroundColor: statusColors[data.summary.vegetationStatus] }]}>
                {data.summary.vegetationStatus}
              </Text>
            </View>
            <Text style={styles.tableCell}>
              {data.summary.vegetationStatus === 'excellent' ? 'Dense, healthy vegetation' :
               data.summary.vegetationStatus === 'good' ? 'Healthy vegetation' :
               data.summary.vegetationStatus === 'fair' ? 'Moderate vegetation' : 'Sparse vegetation'}
            </Text>
          </View>
          
          {/* Add other summary rows similarly */}
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vegetation Indices</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Index</Text>
            <Text style={styles.tableCell}>Value</Text>
            <Text style={styles.tableCell}>Status</Text>
            <Text style={styles.tableCell}>Description</Text>
          </View>
          
          {data.indexValues.map((index, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.tableCell}>{index.name}</Text>
              <Text style={styles.tableCell}>{index.value}</Text>
              <View style={styles.tableCell}>
                <Text style={[styles.statusBadge, { 
                  backgroundColor: index.status === 'good' ? '#4CAF50' :
                                   index.status === 'low' ? '#F44336' : '#2196F3'
                }]}>
                  {index.status}
                </Text>
              </View>
              <Text style={styles.tableCell}>{index.description}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommendations</Text>
        {data.recommendations.map((rec, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.value}>• {rec}</Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

export default LandAnalysisReport;