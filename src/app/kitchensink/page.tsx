"use client";

import { useState } from "react";
import {
  Bus,
  Siren,
  MapPin,
  UserRound,
  Bell,
  ShieldAlert,
} from "lucide-react";
import {
  Button,
  IconButton,
  Card,
  Input,
  PinInput,
  Select,
  Badge,
  StatusPill,
  Modal,
  BottomSheet,
  ToastProvider,
  useToast,
  Spinner,
  Skeleton,
  EmptyState,
  Avatar,
  Divider,
  Switch,
} from "@/components/ui";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { ConnectionBanner } from "@/components/feedback/ConnectionBanner";
import { AlertOverlay } from "@/components/feedback/AlertOverlay";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-text-muted">
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function KitchenSinkContent() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [switchOn, setSwitchOn] = useState(true);
  const [showSos, setShowSos] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const toast = useToast();

  return (
    <AppShell>
      <ToastProvider />
      <ConnectionBanner />
      <TopBar
        title="Kitchen Sink"
        subtitle="Design system preview"
        actions={<Badge variant="danger">Dev only</Badge>}
      />

      <div className="mx-auto max-w-2xl p-6">
        <Section title="Buttons">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" loading>
              Loading
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="lg" fullWidth>
              Large Full Width
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <IconButton icon={<Bus className="h-5 w-5" />} label="Vehicles" variant="secondary" />
            <IconButton icon={<Siren className="h-5 w-5" />} label="SOS" variant="ghost" />
          </div>
        </Section>

        <Section title="Card">
          <Card>
            <p className="text-sm font-bold uppercase italic text-text">Fleet Command</p>
            <p className="mt-1 text-xs text-text-muted">A basic surface card with border + shadow.</p>
          </Card>
        </Section>

        <Section title="Inputs">
          <Input label="Username" placeholder="ADMIN01" />
          <Input label="Phone" placeholder="0821234567" error="Invalid phone number" />
          <PinInput label="PIN" value={pin} onChange={setPin} length={4} />
          <Select label="Assigned Vehicle" defaultValue="">
            <option value="" disabled>
              Select a vehicle
            </option>
            <option value="1">NDZ 123 GP — John Doe</option>
            <option value="2">ABC 456 GP — Jane Smith</option>
          </Select>
        </Section>

        <Section title="Badges & Status Pills">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="info">Info</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill status="active" label="Active" />
            <StatusPill status="sos" label="SOS Triggered" />
            <StatusPill status="arriving" label="Arriving 5 min" />
            <StatusPill status="idle" label="Idle" />
          </div>
        </Section>

        <Section title="Avatar / Divider / Switch">
          <div className="flex items-center gap-3">
            <Avatar name="John Doe" size="sm" />
            <Avatar name="Jane Smith" size="md" />
            <Avatar name="Thabo M" size="lg" />
          </div>
          <Divider />
          <Switch checked={switchOn} onChange={setSwitchOn} label="Night Mode" />
        </Section>

        <Section title="Modal / Bottom Sheet / Toast">
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Open Modal
            </Button>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              Open Bottom Sheet
            </Button>
            <Button variant="secondary" onClick={() => toast("Auto-SMS dispatched to parent.", "success")}>
              Show Toast
            </Button>
          </div>
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Delete Vehicle">
            <p className="text-sm text-text-muted">
              Are you sure you want to delete this vehicle? This will affect linked learners.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" fullWidth onClick={() => setModalOpen(false)}>
                Delete
              </Button>
            </div>
          </Modal>
          <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Passenger Manifest">
            <p className="text-sm text-text-muted">Sheet content goes here.</p>
          </BottomSheet>
        </Section>

        <Section title="Spinner / Skeleton / Empty State">
          <div className="flex items-center gap-4">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
          <EmptyState
            icon={<MapPin className="h-8 w-8" />}
            title="No Active Vehicles"
            description="Vehicles will appear here once a driver goes live."
            action={<Button variant="secondary">Refresh</Button>}
          />
        </Section>

        <Section title="Alert Overlays">
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setShowWarning(true)}>
              Preview 5-Min Warning
            </Button>
            <Button variant="danger" onClick={() => setShowSos(true)}>
              Preview SOS
            </Button>
          </div>
          <div className="relative h-64 overflow-hidden rounded-lg border border-border">
            <div className="flex h-full items-center justify-center text-xs text-text-muted">
              Overlay preview area
            </div>
            {showWarning && (
              <AlertOverlay
                variant="warning"
                icon={<Bell className="h-10 w-10 text-black" />}
                title="Driver Approaching"
                subtitle="Arriving in 5 Minutes"
                onDismiss={() => setShowWarning(false)}
              >
                <div className="w-full max-w-sm rounded-3xl border-4 border-black/20 bg-black/10 p-6">
                  <p className="text-sm font-bold text-black">
                    Please ensure the learner is ready at the pickup point.
                  </p>
                </div>
              </AlertOverlay>
            )}
            {showSos && (
              <AlertOverlay
                variant="danger"
                icon={<ShieldAlert className="h-10 w-10 text-black" />}
                title="Route Delayed"
                subtitle="Driver has reported an issue"
                onDismiss={() => setShowSos(false)}
              >
                <div className="w-full max-w-sm rounded-3xl border-4 border-black/20 bg-black/10 p-6">
                  <p className="text-sm font-bold text-black">
                    Dispatch has been notified and is managing the situation.
                  </p>
                </div>
              </AlertOverlay>
            )}
          </div>
        </Section>

        <Section title="Icons in context">
          <div className="flex items-center gap-4 text-text-muted">
            <UserRound className="h-6 w-6" />
            <Bus className="h-6 w-6" />
            <MapPin className="h-6 w-6" />
            <Bell className="h-6 w-6" />
            <Siren className="h-6 w-6" />
            <ShieldAlert className="h-6 w-6" />
          </div>
        </Section>
      </div>
    </AppShell>
  );
}

export default function KitchenSinkPage() {
  return <KitchenSinkContent />;
}
