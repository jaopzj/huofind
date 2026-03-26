import { useOutletContext, useNavigate } from 'react-router-dom';
import { DeclarationAssistantPage } from '../components/DeclarationAssistant';
import { resolvePagePath } from '../utils/routes';

export default function DeclarationPageWrapper() {
    const ctx = useOutletContext();
    const navigate = useNavigate();

    return (
        <DeclarationAssistantPage
            isRestricted={ctx.isRestrictedForPremiumFeatures}
            onNavigate={(pageId, params) => {
                if (params?.initialValue) {
                    window.__feeCalculatorInitialValue = params.initialValue;
                }
                navigate(resolvePagePath(pageId));
            }}
        />
    );
}
