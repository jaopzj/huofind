import { useOutletContext, useNavigate } from 'react-router-dom';
import YupooSearchPage from '../components/YupooSearch/YupooSearchPage';
import { resolvePagePath } from '../utils/routes';

export default function YupooPageWrapper() {
    const ctx = useOutletContext();
    const navigate = useNavigate();

    return (
        <div className="h-full w-full">
            <YupooSearchPage
                showBRL={ctx.showBRL}
                onToggleCurrency={ctx.toggleCurrency}
                exchangeRate={ctx.exchangeRate}
                savedProductUrls={ctx.savedProductUrls}
                onSaveToggle={ctx.handleSaveProductToggle}
                isGuest={ctx.isGuest}
                isBronze={ctx.isBronze}
                onNavigate={(pageId) => navigate(resolvePagePath(pageId))}
            />
        </div>
    );
}
