import { Button, Tag } from "@dhis2/ui";
import { observer } from "mobx-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RetreatLocation from "./RetreatLocation";
import RetreatModel from "./RetreatModal";
import {
  FiActivity,
  FiAlertCircle,
  FiCalendar,
  FiClock,
  FiLayers,
  FiMapPin,
  FiMessageSquare,
  FiUsers
} from "react-icons/fi";
import "./RetreatsDashboard.css";

const getTypeColor = (type) => {
  const normalizedType = type?.toLowerCase() || "";
  if (normalizedType.includes("silent")) return "#6610f2"; // Purple
  if (normalizedType.includes("general")) return "#28a745"; // Green
  return "#6c757d"; // Gray default
};

const Retreat = ({ retreat }) => {
  const navigate = useNavigate();

  const plusDateTo = new Date(retreat.endDate);
  plusDateTo.setDate(plusDateTo.getDate() + 1);

  return (
    <div
      className="retreat-card-wrapper"
      style={{ borderTopColor: getTypeColor(retreat.retreatType) }}
      onClick={() => navigate(retreat.id)}
    >
      <div className="retreat-card-body">
        <div className="retreat-header">
          <span className="retreat-name">{retreat.name}</span>
          <Tag neutral>{retreat.retreatCode}</Tag>
        </div>

        <div className="tags-row">
          {retreat.finalized && <Tag positive bold>Finalized</Tag>}
          <Tag positive={!retreat.disabled} negative={retreat.disabled}>
            {retreat.disabled ? "Disabled" : "Active"}
          </Tag>
          <Tag>{retreat.retreatType?.toUpperCase()}</Tag>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <span className="info-icon"><FiCalendar /></span>
            <span>
              {retreat.date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}{" "}
              -{" "}
              {plusDateTo.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          <div className="info-item">
            <span className="info-icon"><FiClock /></span>
            <span>{retreat.noOfDays} Days</span>
          </div>

          <div className="info-item">
            <span className="info-icon"><FiMapPin /></span>
            <span><RetreatLocation locationId={retreat.location} /></span>
          </div>

          <div className="info-item">
            <span className="info-icon"><FiUsers /></span>
            <span>{retreat.totalYogis} Yogis</span>
          </div>
        </div>

        <div className="manage-btn-container">
          <Button
            primary
            onClick={(data, e) => {
              e?.stopPropagation();
              navigate(retreat.id);
            }}
          >
            Manage
          </Button>
        </div>
      </div>
    </div>
  );
};

const RetreatsDashboard = observer(({ store }) => {
  const [hideRetreatModel, setHideRetreatModel] = useState(true);

  return (
    <div className="retreats-dashboard-container">
      <div className="dashboard-header-row">
        <h2 className="dashboard-header-title">Dashboard</h2>
        <div>
          <Button
            primary
            onClick={() => {
              setHideRetreatModel(false);
            }}
          >
            Create Retreat
          </Button>
          {!hideRetreatModel && (
            <RetreatModel
              store={store}
              onCancel={() => {
                setHideRetreatModel(true);
              }}
            />
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card-wrapper">
          <div className="stat-title">SMS Credits</div>
          <div className="stat-value">
            {store.metadata.smsCredits ? `LKR ${store.metadata.smsCredits.balance}` : "..."}
          </div>
          <FiMessageSquare className="stat-icon" />
        </div>
        <div className="stat-card-wrapper">
          <div className="stat-title">Active Retreats</div>
          <div className="stat-value">{store.metadata.currentRetreats.length}</div>
          <FiActivity className="stat-icon" />
        </div>
        <div className="stat-card-wrapper">
          <div className="stat-title">Total Retreats</div>
          <div className="stat-value">{store.metadata.retreats.length}</div>
          <div style={{ fontSize: "0.85em", color: "#6e7a8a", marginTop: 4 }}>
            General:{" "}
            {
              store.metadata.retreats.filter((r) =>
                r.retreatType?.toLowerCase().includes("general"),
              ).length
            }{" "}
            | Silent:{" "}
            {
              store.metadata.retreats.filter((r) =>
                r.retreatType?.toLowerCase().includes("silent"),
              ).length
            }
          </div>
          <FiLayers className="stat-icon" />
        </div>
        <div className="stat-card-wrapper bg-danger-light">
          <div className="stat-title text-danger-custom">Unfinalized</div>
          <div className="stat-value text-danger-custom">
            {store.metadata.retreats.filter(r => !r.finalized).length}
          </div>
          <FiAlertCircle className="stat-icon text-danger-custom" />
        </div>
      </div>

      <h5 className="dashboard-section-title">Current Retreats</h5>
      {store.metadata.currentRetreats.length === 0 && (
        <p className="no-retreats-msg">There are no current retreats</p>
      )}
      <div className="retreats-grid">
        {store.metadata.currentRetreats.map((retreat) => {
          return <Retreat retreat={retreat} key={retreat.id} />;
        })}
      </div>

      <h5 className="dashboard-section-title">Past Retreats</h5>
      <div className="retreats-grid">
        {store.metadata.retreats.filter(retreat => !retreat.current).map((retreat) => {
          return <Retreat retreat={retreat} key={retreat.id} />;
        })}
      </div>
    </div>
  );
});

export default RetreatsDashboard;
