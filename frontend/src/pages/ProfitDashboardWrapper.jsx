import { useOutletContext } from 'react-router-dom';
import { ProfitDashboardPage } from '../components/ProfitDashboard';

export default function ProfitDashboardWrapper() {
    const ctx = useOutletContext();
    return <ProfitDashboardPage userTier={ctx.userTier} />;
}
