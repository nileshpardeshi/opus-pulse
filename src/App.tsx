import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ExecutiveDashboard from './screens/ExecutiveDashboard';
import BillingForecast from './screens/BillingForecast';
import MarginDetail from './screens/MarginDetail';
import MarginRiskAI from './screens/MarginRiskAI';
import CapacityPlanner from './screens/CapacityPlanner';
import OutcomePricing from './screens/OutcomePricing';
import ComparisonWorkbench from './screens/ComparisonWorkbench';
import StoryPointEconomics from './screens/StoryPointEconomics';
import DeliveryMarketplace from './screens/DeliveryMarketplace';
import Reports from './screens/Reports';
import Admin from './screens/Admin';
import ChangeRequests from './screens/ChangeRequests';
import RevenueWip from './screens/RevenueWip';
import Alerts from './screens/Alerts';
import DealPipeline from './screens/DealPipeline';
import Utilization from './screens/Utilization';
import Approvals from './screens/Approvals';

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<ExecutiveDashboard />} />
        <Route path="/billing" element={<BillingForecast />} />
        <Route path="/margin" element={<MarginDetail />} />
        <Route path="/risk" element={<MarginRiskAI />} />
        <Route path="/capacity" element={<CapacityPlanner />} />
        <Route path="/pricing" element={<OutcomePricing />} />
        <Route path="/comparison" element={<ComparisonWorkbench />} />
        <Route path="/sp-economics" element={<StoryPointEconomics />} />
        <Route path="/marketplace" element={<DeliveryMarketplace />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/change-requests" element={<ChangeRequests />} />
        <Route path="/revenue" element={<RevenueWip />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/pipeline" element={<DealPipeline />} />
        <Route path="/utilization" element={<Utilization />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="*" element={<ExecutiveDashboard />} />
      </Routes>
    </AppLayout>
  );
}
