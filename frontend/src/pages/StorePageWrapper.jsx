import { useOutletContext } from 'react-router-dom';
import { StorePage } from '../components/Store';

export default function StorePageWrapper() {
    const ctx = useOutletContext();

    return (
        <StorePage
            user={ctx.user}
            miningInfo={ctx.miningInfo}
        />
    );
}
