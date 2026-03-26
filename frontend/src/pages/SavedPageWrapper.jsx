import { useOutletContext, useNavigate } from 'react-router-dom';
import SavedPage from '../components/SavedPage';

export default function SavedPageWrapper() {
    const ctx = useOutletContext();
    const navigate = useNavigate();

    return (
        <SavedPage
            products={ctx.savedProducts}
            collections={ctx.collections}
            collectionIcons={ctx.collectionIcons}
            collectionColors={ctx.collectionColors}
            onCreateCollection={ctx.handleCreateCollection}
            onUpdateCollection={ctx.handleUpdateCollection}
            onDeleteCollection={ctx.handleDeleteCollection}
            onMoveProductToCollection={ctx.handleMoveProductToCollection}
            onRemoveProduct={ctx.handleRemoveProduct}
            tier={ctx.userTier}
            tierLimits={ctx.tierLimits}
            onSelectSeller={(sellerUrl) => {
                ctx.setHeroUrl(sellerUrl);
                navigate('/mining');
                ctx.handleUrlChange(sellerUrl);
            }}
        />
    );
}
