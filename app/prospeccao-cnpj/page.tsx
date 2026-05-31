import Tabs from "@/components/Tabs";
import AuthGuard from "@/components/AuthGuard";

export default function ProspeccaoCnpjPage() {
  return (
    <AuthGuard>
      <div>
        <section className="dashboard-shell panel-fade-up-delay p-4 sm:p-6">
          <Tabs />
        </section>
      </div>
    </AuthGuard>
  );
}
