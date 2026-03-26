import { useOutletContext } from 'react-router-dom';
import { ProfilePage } from '../components/Profile';

export default function ProfilePageWrapper() {
    const ctx = useOutletContext();

    return (
        <ProfilePage
            user={ctx.user}
            miningInfo={ctx.miningInfo}
            savedProductsCount={ctx.savedProducts.length}
            savedSellersCount={ctx.savedSellerIds.length}
            collectionsCount={ctx.collections.length}
            onLogout={ctx.logout}
            onShowUpgrade={() => ctx.setShowLimitError(true)}
            onUserUpdate={(updatedUser) => {
                console.log('User updated:', updatedUser);
            }}
        />
    );
}
