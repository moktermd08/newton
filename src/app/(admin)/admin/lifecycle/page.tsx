import { PageHeader } from "@gg/ui";
import { LifecycleWorkbench } from "@/components/lifecycle-workbench";

export default function LifecyclePage() {
  return (
    <>
      <PageHeader
        icon="layers"
        title="Lifecycle engine"
        subtitle="Describe an organisation. Newton weights the lifecycle and picks tools, technology, people, cost and build-versus-buy."
      />
      <LifecycleWorkbench />
    </>
  );
}
