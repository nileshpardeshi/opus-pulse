import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Configuration from './screens/Configuration';
import BillingSimulator from './screens/BillingSimulator';
import OutcomeSimulator from './screens/OutcomeSimulator';

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Configuration />} />
        <Route path="/billing" element={<BillingSimulator />} />
        <Route path="/outcome" element={<OutcomeSimulator />} />
        <Route path="*" element={<Configuration />} />
      </Routes>
    </AppLayout>
  );
}
