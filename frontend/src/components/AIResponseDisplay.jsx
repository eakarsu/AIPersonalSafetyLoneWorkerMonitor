import React from 'react';
import AIReport from './AIReport';

export default function AIResponseDisplay({ response, title, loading }) {
  return <AIReport response={response} title={title || 'AI Analysis Report'} loading={loading} />;
}
