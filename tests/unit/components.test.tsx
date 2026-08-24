import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { RatingStars } from "@/components/RatingStars";
import { FormError } from "@/components/FormError";

describe("BookingStatusBadge", () => {
  it("renders a human-readable label for each status", () => {
    render(<BookingStatusBadge status="in_progress" />);
    expect(screen.getByText("Rental in progress")).toBeInTheDocument();
  });

  it("labels a paid booking as awaiting pickup", () => {
    render(<BookingStatusBadge status="paid" />);
    expect(screen.getByText(/awaiting pickup/i)).toBeInTheDocument();
  });
});

describe("RatingStars", () => {
  it("rounds a fractional score for display", () => {
    render(<RatingStars score={4.6} />);
    expect(screen.getByLabelText("4.6 out of 5 stars")).toBeInTheDocument();
  });
});

describe("FormError", () => {
  it("renders nothing when there is no message", () => {
    const { container } = render(<FormError message={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the message as an alert when present", () => {
    render(<FormError message="Something went wrong" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  });
});
