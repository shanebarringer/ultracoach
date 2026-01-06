'use client'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  useDisclosure,
} from '@heroui/react'
import { AlertTriangle, Award, Calendar, ExternalLink, Plus, X } from 'lucide-react'

import { useState } from 'react'

import { createLogger } from '@/lib/logger'
import { commonToasts } from '@/lib/toast'
import type { Certification } from '@/types/profile'

const logger = createLogger('CertificationsSection')

interface CertificationsSectionProps {
  certifications: Certification[]
  onCertificationsChange: (certifications: Certification[]) => void
  isEditable?: boolean
}

const COMMON_CERTIFICATIONS = [
  { name: 'UESCA Ultrarunning Coach', organization: 'UESCA' },
  { name: 'RRCA Certified Running Coach', organization: 'RRCA' },
  { name: 'USATF Level 1 Coach', organization: 'USATF' },
  { name: 'NASM Certified Personal Trainer', organization: 'NASM' },
  { name: 'Wilderness First Responder', organization: 'NOLS' },
  { name: 'CPR/AED Certified', organization: 'American Red Cross' },
  { name: 'Sports Nutrition Specialist', organization: 'NASM' },
  { name: 'Mental Performance Coach', organization: 'CMPC' },
]

const COACHING_SPECIALTIES = [
  '100 Mile Races',
  'Mountain Running',
  'First-time Ultras',
  'Nutrition Planning',
  'Mental Training',
  'Heat Adaptation',
  'Altitude Training',
  'Trail Running',
  'Road Ultras',
  'Multi-day Events',
]

export default function CertificationsSection({
  certifications,
  onCertificationsChange,
  isEditable = true,
}: CertificationsSectionProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [selectedCert, setSelectedCert] = useState('')
  const [customName, setCustomName] = useState('')
  const [organization, setOrganization] = useState('')
  const [credentialId, setCredentialId] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [verificationUrl, setVerificationUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleAddCertification = async () => {
    const certName = selectedCert === 'custom' ? customName : selectedCert
    const certOrg =
      selectedCert === 'custom'
        ? organization
        : COMMON_CERTIFICATIONS.find(c => c.name === selectedCert)?.organization || organization

    if (!certName || !certOrg) {
      commonToasts.saveError('Please fill in required fields')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/profile/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: certName,
          issuing_organization: certOrg,
          credential_id: credentialId || undefined,
          issue_date: issueDate || undefined,
          expiration_date: expirationDate || undefined,
          verification_url: verificationUrl || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add certification')
      }

      const newCertification = await response.json()
      onCertificationsChange([...certifications, newCertification])

      // Reset form
      resetForm()
      onClose()

      commonToasts.saveSuccess()
      logger.info('Certification added', { name: certName })
    } catch (error) {
      logger.error('Failed to add certification:', error)
      commonToasts.saveError('Failed to add certification')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveCertification = async (certId: string, certName: string) => {
    try {
      const response = await fetch(`/api/profile/certifications/${certId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error('Failed to remove certification')
      }

      onCertificationsChange(certifications.filter(c => c.id !== certId))
      commonToasts.deleteSuccess()
      logger.info('Certification removed', { certId, name: certName })
    } catch (error) {
      logger.error('Failed to remove certification:', error)
      commonToasts.deleteError('Failed to remove certification')
    }
  }

  const resetForm = () => {
    setSelectedCert('')
    setCustomName('')
    setOrganization('')
    setCredentialId('')
    setIssueDate('')
    setExpirationDate('')
    setVerificationUrl('')
  }

  const isExpired = (cert: Certification) => {
    if (!cert.expiration_date) return false
    return new Date(cert.expiration_date) < new Date()
  }

  const isExpiringSoon = (cert: Certification) => {
    if (!cert.expiration_date) return false
    const expirationDate = new Date(cert.expiration_date)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return expirationDate <= thirtyDaysFromNow && expirationDate >= new Date()
  }

  const getStatusColor = (cert: Certification) => {
    if (isExpired(cert)) return 'danger'
    if (isExpiringSoon(cert)) return 'warning'
    if (cert.status === 'active') return 'success'
    return 'default'
  }

  const getStatusText = (cert: Certification) => {
    if (isExpired(cert)) return 'Expired'
    if (isExpiringSoon(cert)) return 'Expires Soon'
    return cert.status.charAt(0).toUpperCase() + cert.status.slice(1)
  }

  return (
    <Card className="border border-divider">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="flex items-center justify-between w-full">
          <h3 className="text-lg font-semibold text-foreground">Certifications & Specialties</h3>
          {isEditable && (
            <Button
              size="sm"
              color="primary"
              variant="flat"
              startContent={<Plus className="w-4 h-4" />}
              onPress={onOpen}
            >
              Add
            </Button>
          )}
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="space-y-6">
        {/* Certifications */}
        {certifications.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground-600 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Certifications
            </h4>
            <div className="space-y-3">
              {certifications.map(cert => (
                <div
                  key={cert.id}
                  className="flex items-start justify-between p-3 bg-default-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h5 className="font-medium text-foreground">{cert.name}</h5>
                        <p className="text-sm text-foreground-600">{cert.issuing_organization}</p>
                        {cert.credential_id && (
                          <p className="text-xs text-foreground-500">ID: {cert.credential_id}</p>
                        )}
                        {cert.expiration_date && (
                          <div className="flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3 text-foreground-400" />
                            <span className="text-xs text-foreground-500">
                              Expires: {new Date(cert.expiration_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Chip
                          size="sm"
                          color={getStatusColor(cert)}
                          variant="flat"
                          startContent={
                            isExpired(cert) || isExpiringSoon(cert) ? (
                              <AlertTriangle className="w-3 h-3" />
                            ) : (
                              <Award className="w-3 h-3" />
                            )
                          }
                        >
                          {getStatusText(cert)}
                        </Chip>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {cert.verification_url && (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        as="a"
                        href={cert.verification_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    {isEditable && (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => handleRemoveCertification(cert.id, cert.name)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coaching Specialties */}
        <div>
          <h4 className="text-sm font-medium text-foreground-600 mb-3">Coaching Specialties</h4>
          <div className="flex flex-wrap gap-2">
            {COACHING_SPECIALTIES.slice(0, 6).map(specialty => (
              <Chip key={specialty} size="sm" variant="flat" color="primary">
                {specialty}
              </Chip>
            ))}
          </div>
        </div>

        {certifications.length === 0 && (
          <div className="text-center py-8">
            <Award className="w-12 h-12 text-foreground-300 mx-auto mb-4" />
            <p className="text-foreground-600 mb-4">
              Add your coaching certifications to build trust with potential athletes
            </p>
            {isEditable && (
              <Button
                color="primary"
                variant="flat"
                startContent={<Plus className="w-4 h-4" />}
                onPress={onOpen}
              >
                Add Certification
              </Button>
            )}
          </div>
        )}
      </CardBody>

      {/* Add Certification Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalContent>
          <ModalHeader>Add Certification</ModalHeader>
          <ModalBody className="space-y-4">
            <Select
              label="Certification"
              placeholder="Select a certification or choose custom"
              selectedKeys={selectedCert ? [selectedCert] : []}
              onSelectionChange={keys => {
                const selected = Array.from(keys)[0]
                setSelectedCert(selected ? String(selected) : '')
              }}
              variant="bordered"
            >
              <>
                {COMMON_CERTIFICATIONS.map(cert => (
                  <SelectItem key={cert.name}>
                    {cert.name} - {cert.organization}
                  </SelectItem>
                ))}
                <SelectItem key="custom">Custom Certification</SelectItem>
              </>
            </Select>

            {selectedCert === 'custom' && (
              <>
                <Input
                  label="Certification Name"
                  placeholder="e.g., Advanced Trail Running Coach"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  variant="bordered"
                  isRequired
                />
                <Input
                  label="Issuing Organization"
                  placeholder="e.g., International Trail Running Association"
                  value={organization}
                  onChange={e => setOrganization(e.target.value)}
                  variant="bordered"
                  isRequired
                />
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Credential ID (Optional)"
                placeholder="Certificate number"
                value={credentialId}
                onChange={e => setCredentialId(e.target.value)}
                variant="bordered"
              />
              <Input
                label="Issue Date (Optional)"
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                variant="bordered"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Expiration Date (Optional)"
                type="date"
                value={expirationDate}
                onChange={e => setExpirationDate(e.target.value)}
                variant="bordered"
              />
              <Input
                label="Verification URL (Optional)"
                placeholder="https://..."
                value={verificationUrl}
                onChange={e => setVerificationUrl(e.target.value)}
                variant="bordered"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => {
                resetForm()
                onClose()
              }}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleAddCertification}
              isLoading={isLoading}
              isDisabled={
                !selectedCert || (selectedCert === 'custom' && (!customName || !organization))
              }
            >
              Add Certification
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  )
}
