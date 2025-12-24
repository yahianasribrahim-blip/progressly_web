import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { UserAvatar } from "@/components/shared/user-avatar";

function DeactivateAccountModal({
  showDeactivateAccountModal,
  setShowDeactivateAccountModal,
}: {
  showDeactivateAccountModal: boolean;
  setShowDeactivateAccountModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { data: session } = useSession();
  const [deactivating, setDeactivating] = useState(false);

  async function deactivateAccount() {
    setDeactivating(true);
    try {
      const res = await fetch(`/api/user`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.status === 200) {
        // delay to allow for the route change to complete
        await new Promise((resolve) =>
          setTimeout(() => {
            signOut({
              callbackUrl: `${window.location.origin}/`,
            });
            resolve(null);
          }, 500),
        );
      } else {
        setDeactivating(false);
        const data = await res.json().catch(() => ({ error: "Failed to deactivate account" }));
        throw new Error(data.error || "Failed to deactivate account");
      }
    } catch (err) {
      setDeactivating(false);
      throw err instanceof Error ? err.message : "Failed to deactivate account";
    }
  }


  return (
    <Modal
      showModal={showDeactivateAccountModal}
      setShowModal={setShowDeactivateAccountModal}
      className="gap-0"
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b p-4 pt-8 sm:px-16">
        <UserAvatar
          user={{
            name: session?.user?.name || null,
            image: session?.user?.image || null,
          }}
        />
        <h3 className="text-lg font-semibold">Deactivate Account</h3>
        <p className="text-center text-sm text-muted-foreground">
          Your account will be <b>deactivated for 7 days</b> before permanent deletion.
        </p>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">You can restore your account anytime within 7 days!</p>
          <p className="text-xs mt-1 text-amber-700 dark:text-amber-300">
            Just log in again and you&apos;ll have the option to reactivate.
          </p>
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          toast.promise(deactivateAccount(), {
            loading: "Deactivating account...",
            success: "Account deactivated. You have 7 days to restore it.",
            error: (err) => err,
          });
        }}
        className="flex flex-col space-y-6 bg-accent px-4 py-8 text-left sm:px-16"
      >
        <div>
          <label htmlFor="verification" className="block text-sm">
            To verify, type{" "}
            <span className="font-semibold text-black dark:text-white">
              confirm deactivate account
            </span>{" "}
            below
          </label>
          <Input
            type="text"
            name="verification"
            id="verification"
            pattern="confirm deactivate account"
            required
            autoFocus={false}
            autoComplete="off"
            className="mt-1 w-full border bg-background"
          />
        </div>

        <Button
          variant={deactivating ? "disable" : "destructive"}
          disabled={deactivating}
        >
          Deactivate my account
        </Button>
      </form>
    </Modal>
  );
}

export function useDeactivateAccountModal() {
  const [showDeactivateAccountModal, setShowDeactivateAccountModal] = useState(false);

  const DeactivateAccountModalCallback = useCallback(() => {
    return (
      <DeactivateAccountModal
        showDeactivateAccountModal={showDeactivateAccountModal}
        setShowDeactivateAccountModal={setShowDeactivateAccountModal}
      />
    );
  }, [showDeactivateAccountModal, setShowDeactivateAccountModal]);

  return useMemo(
    () => ({
      setShowDeactivateAccountModal,
      DeactivateAccountModal: DeactivateAccountModalCallback,
    }),
    [setShowDeactivateAccountModal, DeactivateAccountModalCallback],
  );
}

// Keep backwards compatibility with old hook name
export function useDeleteAccountModal() {
  return useDeactivateAccountModal();
}
