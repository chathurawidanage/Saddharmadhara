import { Button, Tag } from "@dhis2/ui";
import "bootstrap/dist/css/bootstrap.min.css";
import { observer } from "mobx-react";
import { useState } from "react";
import { Card, Col, Container, Row } from "react-bootstrap";
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
    <Col xs={12} lg={6} xxl={4}>
      <Card
        style={{
          background: `linear-gradient(90deg, ${getTypeColor(retreat.retreatType)}33 0%, #ffffff 3%)`
        }}
        className="h-100 retreat-card"
      >
        <Card.Body className="d-flex flex-column retreat-card-body">
          <div className="retreat-title">
            <span>{retreat.name}</span>
            <Tag neutral>{retreat.retreatCode}</Tag>
          </div>


          <div className="mb-3 d-flex flex-wrap gap-2">
            {retreat.finalized && <Tag positive bold>Finalized</Tag>}
            <Tag positive={!retreat.disabled} negative={retreat.disabled}>
              {retreat.disabled ? "Disabled" : "Active"}
            </Tag>
            <Tag>{retreat.retreatType?.toUpperCase()}</Tag>
          </div>

          <div className="info-grid">
            <div className="info-row">
              <span className="retreat-icon"><FiCalendar /></span>
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

            <div className="info-row">
              <span className="retreat-icon"><FiClock /></span>
              <span>{retreat.noOfDays} Days</span>
            </div>

            <div className="info-row">
              <span className="retreat-icon"><FiMapPin /></span>
              <span><RetreatLocation locationId={retreat.location} /></span>
            </div>

            <div className="info-row">
              <span className="retreat-icon"><FiUsers /></span>
              <span>{retreat.totalYogis} Yogis</span>
            </div>
          </div>

          <div className="manage-btn-container mt-auto pt-2">
            <Button
              primary
              onClick={() => {
                navigate(retreat.id);
              }}
            >
              Manage
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
};

const RetreatsDashboard = observer(({ store }) => {
  const [hideRetreatModel, setHideRetreatModel] = useState(true);

  return (
    <Container fluid className="p-4 retreats-dashboard-container">
      <div className="dashboard-header-row">
        <h2 className="m-0">Dashboard</h2>
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

      <Row className="mb-4 g-4">
        <Col xs={12} sm={6} lg={3}>
          <Card className="stat-card retreat-card">
            <Card.Body className="position-relative overflow-hidden">
              <div className="stat-title">SMS Credits</div>
              <div className="stat-value">
                {store.metadata.smsCredits ? `LKR ${store.metadata.smsCredits.balance}` : "..."}
              </div>
              <div className="stat-icon-wrapper">
                <FiMessageSquare />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card className="stat-card retreat-card">
            <Card.Body className="position-relative overflow-hidden">
              <div className="stat-title">Active Retreats</div>
              <div className="stat-value">{store.metadata.currentRetreats.length}</div>
              <div className="stat-icon-wrapper">
                <FiActivity />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card className="stat-card retreat-card">
            <Card.Body className="position-relative overflow-hidden">
              <div className="stat-title">Total Retreats</div>
              <div className="stat-value">{store.metadata.retreats.length}</div>
              <div className="stat-icon-wrapper">
                <FiLayers />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card
            className="stat-card retreat-card bg-danger-light"
          >
            <Card.Body className="position-relative overflow-hidden">
              <div className="stat-title text-danger-custom">Unfinalized</div>
              <div className="stat-value text-danger-custom">
                {store.metadata.retreats.filter(r => !r.finalized).length}
              </div>
              <div className="stat-icon-wrapper text-danger-custom opacity-15">
                <FiAlertCircle />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <h5 className="dashboard-section-title">Current Retreats</h5>
      {store.metadata.currentRetreats.length === 0 && (
        <p className="text-muted">There are no current retreats</p>
      )}
      <Row className="g-4">
        {store.metadata.currentRetreats.map((retreat) => {
          return <Retreat retreat={retreat} key={retreat.id} />;
        })}
      </Row>

      <h5 className="dashboard-section-title">Past Retreats</h5>
      <Row className="g-4">
        {store.metadata.retreats.filter(retreat => !retreat.current).map((retreat) => {
          return <Retreat retreat={retreat} key={retreat.id} />;
        })}
      </Row>
    </Container>
  );
});

export default RetreatsDashboard;
